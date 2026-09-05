import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../supabase/server";

export interface PortalSession {
  authUserId: string;
  email: string | null;
  guardianId: string;
  schoolId: string;
  status: "pending_invite" | "blocked_no_contact" | "invited" | "active" | "revoked";
}

/**
 * The portal equivalent of lib/core/auth/session.ts's getSession(). A guardian has no
 * school_member row, so their JWT carries no school_id/roles claims (custom_access_token_hook
 * only stamps those for staff) -- schoolId/guardianId here come from `guardian_portal_account`
 * instead, read through the caller's own RLS-scoped client (that table's self-select policy:
 * `auth_user_id = auth.uid()`), never decoded from the token.
 *
 * A signed-in-but-not-yet-'active' guardian (still 'invited', hasn't completed
 * /portal/reset-password) gets a session back here -- callers that need to distinguish
 * "authenticated" from "portal access granted" check `.status` themselves; requirePortalSession
 * below only enforces the former.
 */
export async function getPortalSession(): Promise<PortalSession | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const { data, error } = await supabase
    .from("guardian_portal_account")
    .select("guardian_id, school_id, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  const row = data as unknown as { guardian_id: string; school_id: string; status: PortalSession["status"] } | null;
  if (!row) return null;

  return { authUserId: user.id, email: user.email ?? null, guardianId: row.guardian_id, schoolId: row.school_id, status: row.status };
}

export async function requirePortalSession(): Promise<PortalSession> {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");
  return session;
}

/** The raw access token -- forwarded to apps/worker's /internal/portal/activate, same shape as lib/core/auth/session.ts's getAccessToken. */
export async function getPortalAccessToken(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}
