import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getPermissions } from "@/lib/core/auth/permissions";
import { getStaff } from "@/lib/staff/queries";
import { AddQualificationForm } from "@/lib/staff/components/AddQualificationForm";

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm">{value || "—"}</span>
    </div>
  );
}

export default async function StaffProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const permissions = await getPermissions();
  const staff = await getStaff(session.schoolId!, id);

  if (!staff) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">
            {staff.firstName} {staff.lastName}
          </h1>
          <p className="font-figures text-sm text-muted-foreground">{staff.employeeCode}</p>
        </div>
        {permissions.includes("school.manage_staff") ? (
          <Link
            href={`/people/staff/${staff.id}/edit`}
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary"
          >
            Edit
          </Link>
        ) : null}
      </div>

      <section className="grid grid-cols-2 gap-4 rounded-md border border-border bg-card p-4 sm:grid-cols-3">
        <Field label="Department" value={staff.departmentName} />
        <Field label="Designation" value={staff.designationName} />
        <Field label="Joining date" value={staff.joiningDate} />
        <Field label="Employment status" value={staff.employmentStatus} />
        <Field label="Phone" value={staff.phone} />
        <Field label="Email" value={staff.email} />
      </section>

      <section className="rounded-md border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Roles</h2>
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
      </section>

      <section className="rounded-md border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Qualifications</h2>
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
      </section>
    </div>
  );
}
