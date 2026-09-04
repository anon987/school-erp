import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getPermissions } from "@/lib/core/auth/permissions";
import { getStudent } from "@/lib/students/queries";

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm">{value || "—"}</span>
    </div>
  );
}

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const permissions = await getPermissions();
  const student = await getStudent(session.schoolId!, id);

  if (!student) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">
            {student.firstName} {student.lastName}
          </h1>
          <p className="font-figures text-sm text-muted-foreground">{student.admissionNumber}</p>
        </div>
        {permissions.includes("school.manage_students") ? (
          <Link
            href={`/people/students/${student.id}/edit`}
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary"
          >
            Edit
          </Link>
        ) : null}
      </div>

      <section className="grid grid-cols-2 gap-4 rounded-md border border-border bg-card p-4 sm:grid-cols-3">
        <Field label="Class" value={student.className ? `${student.className} - ${student.sectionName}` : null} />
        <Field label="Roll number" value={student.rollNumber} />
        <Field label="Status" value={student.status} />
        <Field label="Date of birth" value={student.dob} />
        <Field label="Gender" value={student.gender} />
        <Field label="Blood group" value={student.bloodGroup} />
        <Field label="Previous school" value={student.previousSchoolName} />
      </section>

      <section className="rounded-md border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Guardians</h2>
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
      </section>
    </div>
  );
}
