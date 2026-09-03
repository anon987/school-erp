import { RequirePermission } from "@/lib/core/auth/RequirePermission";

export default function MembersPage() {
  return (
    <RequirePermission permission="school.manage_members">
      <h1 className="text-xl font-semibold">Members &amp; Roles</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        school_member / school_member_role and the setMemberRoles worker function (which grants
        or revokes roles and force-revokes sessions on change) exist. The management UI is a
        feature build, not part of this P0 session.
      </p>
    </RequirePermission>
  );
}
