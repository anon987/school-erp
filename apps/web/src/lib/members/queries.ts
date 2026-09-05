import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import type { AssignableRole, SchoolMemberRow } from "./types";

/**
 * P1 roles only (school_owner, principal, school_admin, accountant, teacher, class_teacher) --
 * super_admin is platform-level (never assignable through a school's own settings, also
 * enforced server-side by apps/worker), and P2/P3 roles (parent, student, librarian, ...) have no
 * meaning yet since those modules don't exist -- showing them here would let a school "assign" a
 * role to a feature that isn't built, which is exactly the kind of premature surface
 * CLAUDE.md's phase discipline exists to prevent.
 */
export async function getAssignableRoles(): Promise<AssignableRole[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("role").select("key, label").eq("phase", "P1").order("label");
  if (error) throw error;
  return (data ?? []) as unknown as AssignableRole[];
}

export async function getSchoolMembers(schoolId: string): Promise<SchoolMemberRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("school_member")
    .select(
      "id, auth_user_id, is_active, user_profile:auth_user_id(display_name, email, phone), school_member_role(role:role_id(key))",
    )
    .eq("school_id", schoolId);
  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    id: string;
    auth_user_id: string;
    is_active: boolean;
    user_profile: { display_name: string; email: string | null; phone: string } | null;
    school_member_role: { role: { key: string } | null }[];
  }[];

  return rows
    .filter((r): r is typeof r & { user_profile: NonNullable<typeof r.user_profile> } => Boolean(r.user_profile))
    .map((r) => ({
      schoolMemberId: r.id,
      authUserId: r.auth_user_id,
      displayName: r.user_profile.display_name,
      email: r.user_profile.email,
      phone: r.user_profile.phone,
      isActive: r.is_active,
      roleKeys: r.school_member_role.map((sr) => sr.role?.key).filter((key): key is string => Boolean(key)),
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}
