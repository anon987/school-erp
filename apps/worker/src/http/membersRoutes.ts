import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import { createSupabaseAdminClient } from "../supabaseAdmin";
import { setMemberRoles } from "../lib/setMemberRoles";
import { HttpError, requireCallerPermission, verifyCaller } from "./verifyRequest";

const updateRolesBodySchema = z.object({
  addRoleKeys: z.array(z.string()).default([]),
  removeRoleKeys: z.array(z.string()).default([]),
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
 * The one thing this ticket exists for: /settings/members can't call setMemberRoles directly
 * (it needs the service-role key, which must never reach apps/web -- CLAUDE.md), and can't
 * skip authorization just because the mutation now lives behind a network hop. Every check
 * below is the SAME check the rest of the product already trusts (RLS, fn_has_permission),
 * applied here because this is the one place service-role access starts, not a parallel
 * re-implementation of them.
 */
export async function handleUpdateMemberRoles(req: IncomingMessage, res: ServerResponse, schoolMemberId: string): Promise<void> {
  try {
    const { caller, userClient } = await verifyCaller(req);
    await requireCallerPermission(userClient, caller.roles, "school.manage_members");

    const rawBody = await readJsonBody(req);
    const parsed = updateRolesBodySchema.safeParse(rawBody);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid request body.");
    const { addRoleKeys, removeRoleKeys } = parsed.data;

    if (addRoleKeys.includes("super_admin") || removeRoleKeys.includes("super_admin")) {
      throw new HttpError(400, "super_admin cannot be managed through this endpoint.");
    }
    // Privilege-escalation guard: school.manage_members is held by both school_owner and
    // school_admin (packages/db identity_and_roles migration) -- without this, a school_admin
    // could grant themselves or anyone else school_owner, the highest-privilege role in the
    // school. Revoking school_owner isn't guarded the same way (an owner removing a co-owner, or
    // an owner removing their own role on the way out, are both legitimate).
    if (addRoleKeys.includes("school_owner") && !caller.roles.includes("school_owner")) {
      throw new HttpError(403, "Only an existing school_owner can grant the school_owner role.");
    }

    // Cross-tenant safety comes from RLS, not an extra manual school_id filter: school_member's
    // select policy (packages/db) only returns rows where school_id = the caller's own school
    // (or the caller's own row) -- a schoolMemberId belonging to another school simply isn't
    // found, the same way every other cross-school lookup in this product fails closed.
    const { data: targetMember, error: memberError } = await userClient
      .from("school_member")
      .select("id, auth_user_id, school_id")
      .eq("id", schoolMemberId)
      .maybeSingle();
    if (memberError) throw new HttpError(500, memberError.message);
    const target = targetMember as unknown as { id: string; auth_user_id: string; school_id: string } | null;
    if (!target || target.school_id !== caller.schoolId) {
      throw new HttpError(404, "School member not found.");
    }

    const admin = createSupabaseAdminClient();
    await setMemberRoles(admin, {
      schoolMemberId,
      authUserId: target.auth_user_id,
      schoolId: caller.schoolId,
      actorAuthUserId: caller.authUserId,
      addRoleKeys,
      removeRoleKeys,
    });

    sendJson(res, 200, { ok: true });
  } catch (err) {
    if (err instanceof HttpError) {
      sendJson(res, err.status, { error: err.message });
      return;
    }
    console.error("[worker] handleUpdateMemberRoles failed:", err);
    sendJson(res, 500, { error: "Internal error." });
  }
}
