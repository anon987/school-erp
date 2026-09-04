import { requireSession } from "@/lib/core/auth/requireSession";
import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { getStaffFormOptions } from "@/lib/staff/queries";
import { StaffForm } from "@/lib/staff/components/StaffForm";

export default async function NewStaffPage() {
  const session = await requireSession();
  const options = await getStaffFormOptions(session.schoolId!);

  return (
    <RequirePermission permission="school.manage_staff">
      <h1 className="mb-4 text-2xl font-semibold">New staff record</h1>
      <StaffForm options={options} />
    </RequirePermission>
  );
}
