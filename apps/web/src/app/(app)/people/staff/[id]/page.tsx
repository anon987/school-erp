import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { StatusBadge } from "@schoolerp/ui";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getPermissions } from "@/lib/core/auth/permissions";
import { getStaff } from "@/lib/staff/queries";
import { staffStatusBadgeState } from "@/lib/staff/statusBadge";
import { AddQualificationForm } from "@/lib/staff/components/AddQualificationForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Avatar } from "@/components/Avatar";
import { CollapsibleSection } from "@/components/CollapsibleSection";

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value || "—"}</span>
    </div>
  );
}

export default async function StaffProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const permissions = await getPermissions();
  const staff = await getStaff(session.schoolId!, id);

  if (!staff) notFound();

  const badgeState = staffStatusBadgeState(staff.employmentStatus);

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: "Staff", href: "/people/staff" }, { label: `${staff.firstName} ${staff.lastName}` }]} />

      <div className="flex items-center justify-end">
        {permissions.includes("school.manage_staff") ? (
          <Link
            href={`/people/staff/${staff.id}/edit`}
            className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit
          </Link>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <aside className="flex shrink-0 flex-col items-center gap-2 rounded-md border border-border bg-card p-4 text-center shadow-sm md:w-64">
          <Avatar firstName={staff.firstName} lastName={staff.lastName} />
          <p className="text-lg font-semibold">
            {staff.firstName} {staff.lastName}
          </p>
          <p className="font-figures text-sm text-muted-foreground">{staff.employeeCode}</p>
          <p className="text-sm text-muted-foreground">{staff.designationName ?? staff.departmentName ?? "—"}</p>
          {badgeState ? <StatusBadge state={badgeState} label={staff.employmentStatus} /> : null}
        </aside>

        <div className="flex flex-1 flex-col gap-4">
          <CollapsibleSection title="Profile">
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Field label="Department" value={staff.departmentName} />
              <Field label="Designation" value={staff.designationName} />
              <Field label="Joining date" value={staff.joiningDate} />
              <Field label="Phone" value={staff.phone} />
              <Field label="Email" value={staff.email} />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Roles">
            {staff.hasLogin ? (
              staff.roles.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {staff.roles.map((role) => (
                    <span key={role} className="rounded bg-secondary px-2 py-1 text-xs capitalize">
                      {role.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Has a login but no roles assigned yet.</p>
              )
            ) : (
              <p className="text-sm text-muted-foreground">No system login for this staff member.</p>
            )}
          </CollapsibleSection>

          <CollapsibleSection title="Qualifications">
            {staff.qualifications.length > 0 ? (
              <ul className="mb-4 flex flex-col gap-2">
                {staff.qualifications.map((q) => (
                  <li key={q.id} className="grid grid-cols-3 gap-2 text-sm">
                    <span className="font-medium">{q.degree}</span>
                    <span className="text-muted-foreground">{q.institution ?? "—"}</span>
                    <span className="font-figures">{q.yearCompleted ?? "—"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-4 text-sm text-muted-foreground">No qualifications recorded.</p>
            )}
            {permissions.includes("school.manage_staff") ? <AddQualificationForm staffId={staff.id} /> : null}
          </CollapsibleSection>

          {/* Attendance/Leave/Payroll sections attach here as those modules ship -- see the
              equivalent note on the student profile page. */}
        </div>
      </div>
    </div>
  );
}
