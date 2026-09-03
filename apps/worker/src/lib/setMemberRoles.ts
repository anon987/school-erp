import { z } from "zod";
import { revokeSchoolMemberSessions } from "@schoolerp/integrations";
import type { createSupabaseAdminClient } from "../supabaseAdmin";

const inputSchema = z.object({
  schoolMemberId: z.string().uuid(),
  authUserId: z.string().uuid(),
  schoolId: z.string().uuid(),
  actorAuthUserId: z.string().uuid(),
  addRoleKeys: z.array(z.string()).default([]),
  removeRoleKeys: z.array(z.string()).default([]),
});

export type SetMemberRolesInput = z.infer<typeof inputSchema>;

// TODO(types): replace with the generated Row type for `role` once packages/types/src/database.ts
// is regenerated against the real schema (see that file's header). The placeholder Database type
// has no column-level shape, so this cast documents what we know is actually selected below.
type RoleRow = { id: string; key: string };

/**
 * The reference implementation of "a role change must revoke sessions, not just write a row."
 * Any future admin UI for managing school_member_role should call this (or something with the
 * same three steps), not insert/delete the join table directly.
 *
 * Steps, in order: validate -> mutate role assignments -> write audit_log -> force sign-out.
 * The sign-out happens last and unconditionally on any change, whether it was a grant or a
 * revoke -- simpler than trying to detect "is this specifically a downgrade," and the cost of
 * an extra forced re-login on a promotion is low.
 */
export async function setMemberRoles(
  client: ReturnType<typeof createSupabaseAdminClient>,
  rawInput: SetMemberRolesInput,
): Promise<void> {
  const input = inputSchema.parse(rawInput);

  if (input.addRoleKeys.length > 0) {
    const { data: roles, error: roleLookupError } = await client
      .from("role")
      .select("id, key")
      .in("key", input.addRoleKeys);
    if (roleLookupError) throw roleLookupError;

    const rows = ((roles ?? []) as unknown as RoleRow[]).map((r) => ({
      school_member_id: input.schoolMemberId,
      role_id: r.id,
    }));
    if (rows.length > 0) {
      const { error } = await client.from("school_member_role").upsert(rows, {
        onConflict: "school_member_id,role_id",
      });
      if (error) throw error;
    }
  }

  if (input.removeRoleKeys.length > 0) {
    const { data: roles, error: roleLookupError } = await client
      .from("role")
      .select("id, key")
      .in("key", input.removeRoleKeys);
    if (roleLookupError) throw roleLookupError;

    const roleIds = ((roles ?? []) as unknown as RoleRow[]).map((r) => r.id);
    if (roleIds.length > 0) {
      const { error } = await client
        .from("school_member_role")
        .delete()
        .eq("school_member_id", input.schoolMemberId)
        .in("role_id", roleIds);
      if (error) throw error;
    }
  }

  const { error: auditError } = await client.from("audit_log").insert({
    school_id: input.schoolId,
    actor_auth_user_id: input.actorAuthUserId,
    action: "school_member_role.updated",
    entity_type: "school_member",
    entity_id: input.schoolMemberId,
    metadata: { added: input.addRoleKeys, removed: input.removeRoleKeys },
  });
  if (auditError) throw auditError;

  await revokeSchoolMemberSessions(client, input.authUserId);
}
