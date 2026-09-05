import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getSchoolProfile } from "@/lib/school-profile/queries";
import { SchoolProfileForm } from "@/lib/school-profile/components/SchoolProfileForm";

export default async function SchoolProfilePage() {
  const session = await requireSession();
  const profile = await getSchoolProfile(session.schoolId!);

  return (
    <RequirePermission permission="school.manage_profile">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">School profile</h1>
        {profile ? <SchoolProfileForm profile={profile} /> : null}
      </div>
    </RequirePermission>
  );
}
