import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Forces immediate sign-out for a user whose roles just changed, so privilege LOSS is not
 * delayed by the JWT TTL (see the jwt_expiry comment in packages/db/supabase/config.toml).
 * Gaining a role can tolerate waiting up to the TTL for a routine refresh to pick it up;
 * losing one (e.g. an accountant demoted, a teacher's class-teacher assignment pulled) must
 * not.
 *
 * Call this from the same mutation that inserts/deletes a school_member_role row, after the
 * database write commits. It must run with the SERVICE ROLE key -- never call this from
 * apps/web; it belongs in apps/worker, per CLAUDE.md's "service-role key only in the worker"
 * rule.
 *
 * NOTE: verify `auth.admin.signOut`'s signature against the installed @supabase/supabase-js
 * version before relying on this in production -- GoTrue's admin session-revocation surface
 * has shifted across releases. Isolated here on purpose so a version bump touches one function.
 */
export async function revokeSchoolMemberSessions(
  serviceRoleClient: SupabaseClient,
  authUserId: string,
): Promise<void> {
  const { error } = await serviceRoleClient.auth.admin.signOut(authUserId, "global");
  if (error) {
    throw new Error(`Failed to revoke sessions for ${authUserId}: ${error.message}`);
  }
}
