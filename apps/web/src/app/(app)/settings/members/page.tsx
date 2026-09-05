import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getAssignableRoles, getSchoolMembers } from "@/lib/members/queries";
import { MembersTable } from "@/lib/members/components/MembersTable";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function MembersPage() {
  const session = await requireSession();

  return (
    <RequirePermission permission="school.manage_members">
      <MembersBody schoolId={session.schoolId!} />
    </RequirePermission>
  );
}

async function MembersBody({ schoolId }: { schoolId: string }) {
  const [members, roles] = await Promise.all([getSchoolMembers(schoolId), getAssignableRoles()]);

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: "Settings" }, { label: "Members & Roles" }]} />
      <div>
        <h1 className="text-2xl font-semibold">Members &amp; Roles</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Only staff with their own login appear here (a staff record on its own doesn&apos;t create one). Changing anyone&apos;s roles
          signs them out of their current session immediately -- they&apos;ll see the new permissions next time they sign in.
        </p>
      </div>
      <MembersTable members={members} roles={roles} />
    </div>
  );
}
