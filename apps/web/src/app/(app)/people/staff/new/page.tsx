import { requireSession } from "@/lib/core/auth/requireSession";
import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { getStaffFormOptions } from "@/lib/staff/queries";
import { StaffForm } from "@/lib/staff/components/StaffForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function NewStaffPage() {
  const session = await requireSession();
  const options = await getStaffFormOptions(session.schoolId!);

  return (
    <RequirePermission permission="school.manage_staff">
      <div className="flex flex-col gap-4">
        <Breadcrumbs items={[{ label: "Staff", href: "/people/staff" }, { label: "New staff record" }]} />
        <h1 className="text-2xl font-semibold">New staff record</h1>
        <StaffForm options={options} cancelHref="/people/staff" />
      </div>
    </RequirePermission>
  );
}
