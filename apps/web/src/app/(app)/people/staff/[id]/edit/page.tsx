import { notFound } from "next/navigation";
import { requireSession } from "@/lib/core/auth/requireSession";
import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { getStaff, getStaffFormOptions } from "@/lib/staff/queries";
import { StaffForm } from "@/lib/staff/components/StaffForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function EditStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const [staff, options] = await Promise.all([
    getStaff(session.schoolId!, id),
    getStaffFormOptions(session.schoolId!),
  ]);

  if (!staff) notFound();

  return (
    <RequirePermission permission="school.manage_staff">
      <div className="flex flex-col gap-4">
        <Breadcrumbs
          items={[
            { label: "Staff", href: "/people/staff" },
            { label: `${staff.firstName} ${staff.lastName}`, href: `/people/staff/${staff.id}` },
            { label: "Edit" },
          ]}
        />
        <h1 className="text-2xl font-semibold">
          Edit {staff.firstName} {staff.lastName}
        </h1>
        <StaffForm options={options} staff={staff} cancelHref={`/people/staff/${staff.id}`} />
      </div>
    </RequirePermission>
  );
}
