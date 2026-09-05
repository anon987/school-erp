import { supabase } from "../supabase/client";

/**
 * Mirrors apps/web/src/lib/core/auth/permissions.ts -- same fn_role_permissions/fn_has_permission
 * RPCs, so "what this screen shows" and "what the database allows" can never drift apart between
 * the two clients either. Takes `roles` explicitly (from the caller's resolved StaffSession)
 * rather than re-reading the session itself, since this file has no server-side session to call
 * back into.
 */
export async function hasPermission(roles: string[], permissionKey: string): Promise<boolean> {
  if (roles.length === 0) return false;
  const { data, error } = await supabase.rpc("fn_has_permission", { role_keys: roles, perm_key: permissionKey });
  if (error) throw error;
  return Boolean(data);
}

export async function getPermissions(roles: string[]): Promise<string[]> {
  if (roles.length === 0) return [];
  const { data, error } = await supabase.rpc("fn_role_permissions", { role_keys: roles });
  if (error) throw error;
  return ((data ?? []) as { permission_key: string }[]).map((row) => row.permission_key);
}
