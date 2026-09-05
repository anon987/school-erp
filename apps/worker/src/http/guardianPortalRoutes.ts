import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import { createSupabaseAdminClient } from "../supabaseAdmin";
import { activateGuardianPortalAccount, createGuardianPortalAccount } from "../lib/createGuardianPortalAccount";
import { HttpError, requireCallerPermission, verifyCaller, verifyPortalCaller } from "./verifyRequest";

const createPortalAccountBodySchema = z.object({
  email: z.string().trim().email(),
});

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

/**
 * Same reason /settings/members needs apps/worker (membersRoutes.ts): creating an auth.users row
 * needs the Admin API, which needs the service-role key, which must never reach apps/web
 * (CLAUDE.md). Admissions' confirm action is the first caller; Portal's bulk-invite job (P2,
 * next module) will be the second, against the same endpoint.
 */
export async function handleCreateGuardianPortalAccount(req: IncomingMessage, res: ServerResponse, guardianId: string): Promise<void> {
  try {
    const { caller, userClient } = await verifyCaller(req);
    await requireCallerPermission(userClient, caller.roles, "school.manage_admissions");

    const rawBody = await readJsonBody(req);
    const parsed = createPortalAccountBodySchema.safeParse(rawBody);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid request body.");

    // Cross-tenant safety via RLS, same pattern as membersRoutes.ts: guardian's select policy
    // only returns rows in the caller's own school, so a guardianId from another school is
    // simply not found here, not filtered after the fact.
    const { data: guardian, error: guardianError } = await userClient
      .from("guardian")
      .select("id, school_id")
      .eq("id", guardianId)
      .maybeSingle();
    if (guardianError) throw new HttpError(500, guardianError.message);
    const target = guardian as unknown as { id: string; school_id: string } | null;
    if (!target || target.school_id !== caller.schoolId) {
      throw new HttpError(404, "Guardian not found.");
    }

    const admin = createSupabaseAdminClient();
    const result = await createGuardianPortalAccount(admin, {
      guardianId,
      schoolId: caller.schoolId,
      email: parsed.data.email,
    });

    sendJson(res, 200, result);
  } catch (err) {
    if (err instanceof HttpError) {
      sendJson(res, err.status, { error: err.message });
      return;
    }
    console.error("[worker] handleCreateGuardianPortalAccount failed:", err);
    sendJson(res, 500, { error: "Internal error." });
  }
}

/**
 * Called once by the portal, right after a guardian completes `/portal/reset-password`. Uses
 * verifyPortalCaller (not verifyCaller) since a guardian's token has no school_id/roles claims --
 * self-service, no guardianId in the URL, always acts on the verified caller's own row(s).
 */
export async function handleActivateGuardianPortalAccount(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const { authUserId } = await verifyPortalCaller(req);
    const admin = createSupabaseAdminClient();
    await activateGuardianPortalAccount(admin, authUserId);
    sendJson(res, 200, { ok: true });
  } catch (err) {
    if (err instanceof HttpError) {
      sendJson(res, err.status, { error: err.message });
      return;
    }
    console.error("[worker] handleActivateGuardianPortalAccount failed:", err);
    sendJson(res, 500, { error: "Internal error." });
  }
}
