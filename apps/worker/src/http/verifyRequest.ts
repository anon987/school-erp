import type { IncomingMessage } from "node:http";
import { env } from "../env";
import { createSupabaseUserClient } from "../supabaseUser";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface VerifiedCaller {
  authUserId: string;
  schoolId: string;
  roles: string[];
}

function decodeAccessTokenClaims(accessToken: string): { schoolId: string | null; roles: string[] } {
  const payloadSegment = accessToken.split(".")[1];
  if (!payloadSegment) return { schoolId: null, roles: [] };
  const json = Buffer.from(payloadSegment, "base64url").toString("utf8");
  const payload = JSON.parse(json) as { school_id?: string; roles?: string[] };
  return { schoolId: payload.school_id ?? null, roles: payload.roles ?? [] };
}

/**
 * Two checks before anything else, matching apps/web's getSession() pattern: the shared internal
 * secret proves the request came from our own web app (not just anyone who found this port), and
 * auth.getUser() proves the forwarded token is a real, unexpired session -- never trust the
 * locally-decoded JWT claims on their own, a tampered token would decode just fine.
 */
export async function verifyCaller(
  req: IncomingMessage,
): Promise<{ caller: VerifiedCaller; userClient: ReturnType<typeof createSupabaseUserClient> }> {
  const internalSecret = req.headers["x-internal-secret"];
  if (internalSecret !== env.WORKER_INTERNAL_SECRET) {
    throw new HttpError(401, "Missing or invalid internal secret.");
  }

  const authHeader = req.headers.authorization;
  const accessToken = typeof authHeader === "string" ? authHeader.replace(/^Bearer\s+/i, "") : null;
  if (!accessToken) throw new HttpError(401, "Missing bearer token.");

  const userClient = createSupabaseUserClient(accessToken);
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) throw new HttpError(401, "Invalid or expired session.");

  const claims = decodeAccessTokenClaims(accessToken);
  if (!claims.schoolId) throw new HttpError(403, "No school in session.");

  return {
    caller: { authUserId: data.user.id, schoolId: claims.schoolId, roles: claims.roles },
    userClient,
  };
}

/**
 * A parent/guardian portal caller has no school_member row, so their JWT carries no
 * school_id/roles claims (custom_access_token_hook only stamps those for staff) -- verifyCaller
 * above would reject them at the `if (!claims.schoolId)` check. This is the portal equivalent:
 * same internal-secret + genuine-token verification, but returns only the authUserId, since
 * every portal endpoint so far (guardian_portal_account activation) only ever acts on the
 * caller's OWN row, resolved by auth_user_id, not by a school_id claim.
 */
export async function verifyPortalCaller(req: IncomingMessage): Promise<{ authUserId: string }> {
  const internalSecret = req.headers["x-internal-secret"];
  if (internalSecret !== env.WORKER_INTERNAL_SECRET) {
    throw new HttpError(401, "Missing or invalid internal secret.");
  }

  const authHeader = req.headers.authorization;
  const accessToken = typeof authHeader === "string" ? authHeader.replace(/^Bearer\s+/i, "") : null;
  if (!accessToken) throw new HttpError(401, "Missing bearer token.");

  const userClient = createSupabaseUserClient(accessToken);
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) throw new HttpError(401, "Invalid or expired session.");

  return { authUserId: data.user.id };
}

/** Same fn_has_permission RPC RLS policies and apps/web's requirePermission() call -- one source of truth for "can this role do this," never reimplemented here. */
export async function requireCallerPermission(
  userClient: ReturnType<typeof createSupabaseUserClient>,
  roles: string[],
  permissionKey: string,
): Promise<void> {
  const { data, error } = await userClient.rpc("fn_has_permission", { role_keys: roles, perm_key: permissionKey });
  if (error) throw new HttpError(500, error.message);
  if (!data) throw new HttpError(403, `Missing permission: ${permissionKey}`);
}
