import Link from "next/link";
import { notFound } from "next/navigation";
import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getReportCardSetup } from "@/lib/exams/reportCardSetup.queries";
import { getClassRoster } from "@/lib/exams/queries";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function ReportCardSetupStudentsPage({ params }: { params: Promise<{ setupId: string; classId: string }> }) {
  const { setupId, classId } = await params;
  const session = await requireSession();

  return (
    <RequirePermission permission="school.manage_exams">
      <Body schoolId={session.schoolId!} setupId={setupId} classId={classId} />
    </RequirePermission>
  );
}

async function Body({ schoolId, setupId, classId }: { schoolId: string; setupId: string; classId: string }) {
  const setup = await getReportCardSetup(schoolId, setupId);
  if (!setup) notFound();

  const students = await getClassRoster(schoolId, classId, setup.academicYearId);

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs
        items={[
          { label: "Exams", href: "/academics/exams/manage" },
          { label: "Report Cards", href: "/academics/exams/report-cards" },
          { label: setup.name, href: `/academics/exams/report-card-setups/${setupId}` },
        ]}
      />
      <h1 className="text-2xl font-semibold">{setup.name}</h1>
      {students.length === 0 ? (
        <p className="text-sm text-muted-foreground">No students enrolled in this class.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border bg-card shadow-sm">
          {students.map((s) => (
            <li key={s.studentId}>
              <Link href={`/academics/exams/report-card-setups/${setupId}/${classId}/${s.studentId}`} className="flex items-center justify-between px-3 py-2 text-sm hover:bg-secondary">
                <span>
                  {s.firstName} {s.lastName}
                </span>
                <span className="font-figures text-muted-foreground">{s.admissionNumber}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
