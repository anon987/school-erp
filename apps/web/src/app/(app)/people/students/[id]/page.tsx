import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { StatusBadge } from "@schoolerp/ui";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getPermissions } from "@/lib/core/auth/permissions";
import { getStudent } from "@/lib/students/queries";
import { studentStatusBadgeState } from "@/lib/students/statusBadge";
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

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const permissions = await getPermissions();
  const student = await getStudent(session.schoolId!, id);

  if (!student) notFound();

  const badgeState = studentStatusBadgeState(student.status);

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs
        items={[{ label: "Students", href: "/people/students" }, { label: `${student.firstName} ${student.lastName}` }]}
      />

      <div className="flex items-center justify-end">
        {permissions.includes("school.manage_students") ? (
          <Link
            href={`/people/students/${student.id}/edit`}
            className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit
          </Link>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <aside className="flex shrink-0 flex-col items-center gap-2 rounded-md border border-border bg-card p-4 text-center shadow-sm md:w-64">
          <Avatar firstName={student.firstName} lastName={student.lastName} />
          <p className="text-lg font-semibold">
            {student.firstName} {student.lastName}
          </p>
          <p className="font-figures text-sm text-muted-foreground">{student.admissionNumber}</p>
          <p className="text-sm text-muted-foreground">
            {student.className ? `${student.className} - ${student.sectionName}` : "—"}
          </p>
          {badgeState ? <StatusBadge state={badgeState} label={student.status} /> : null}
        </aside>

        <div className="flex flex-1 flex-col gap-4">
          <CollapsibleSection title="Profile">
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Field label="Roll number" value={student.rollNumber} />
              <Field label="Date of birth" value={student.dob} />
              <Field label="Gender" value={student.gender} />
              <Field label="Blood group" value={student.bloodGroup} />
              <Field label="Previous school" value={student.previousSchoolName} />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Guardians">
            {student.guardians.length === 0 ? (
              <p className="text-sm text-muted-foreground">No guardian records.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {student.guardians.map((g) => (
                  <li key={g.guardianId} className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                    <span className="font-medium">{g.firstName}</span>
                    <span className="capitalize text-muted-foreground">{g.relationshipType}</span>
                    <span className="font-figures">{g.phone ?? "—"}</span>
                    <span>{g.email ?? "—"}</span>
                  </li>
                ))}
              </ul>
            )}
          </CollapsibleSection>

          {/* Attendance/Fees/Exams/Documents sections attach here as those modules ship -- each
              is another CollapsibleSection, not a restructure of this page (docs/design-system.md
              > Detail and record pages). None exist yet, so none are stubbed in with no data
              behind them. */}
        </div>
      </div>
    </div>
  );
}
