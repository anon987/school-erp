import { createSupabaseServerClient } from "../supabase/server";
import { getSession } from "./session";

// TODO(types): replace with the generated Returns type for fn_role_permissions once
// packages/types/src/database.ts is regenerated. See that file's header.
interface RolePermissionRow {
  permission_key: string;
}

/**
 * The full permission set for the caller's current roles, used to drive nav visibility. This
 * calls fn_role_permissions -- the exact same SQL function RLS policies call -- over RPC, so
 * "what the nav shows" and "what the database allows" can never drift apart (CLAUDE.md's
 * authorization rule).
 */
export async function getPermissions(): Promise<string[]> {
  const session = await getSession();
  if (!session) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("fn_role_permissions", { role_keys: session.roles });
  if (error) throw error;

  return ((data ?? []) as unknown as RolePermissionRow[]).map((row) => row.permission_key);
}

/** Single-permission check, for gating one action. Same source of truth as getPermissions(). */
export async function hasPermission(permissionKey: string): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("fn_has_permission", {
    role_keys: session.roles,
    perm_key: permissionKey,
  });
  if (error) throw error;

  return Boolean(data);
}

/**
 * Throws if the caller lacks the permission. Use at the top of every server action / route
 * handler that mutates data -- per CLAUDE.md, hiding a button is presentation, not security.
 * The RLS policy on the underlying table is the real backstop; this is the fast, readable
 * failure before a query is even attempted.
 */
export async function requirePermission(permissionKey: string): Promise<void> {
  const allowed = await hasPermission(permissionKey);
  if (!allowed) {
    throw new Error(`Forbidden: missing permission "${permissionKey}"`);
  }
}
