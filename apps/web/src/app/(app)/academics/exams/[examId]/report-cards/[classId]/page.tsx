import Link from "next/link";
import { notFound } from "next/navigation";
import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getExam, getClassRoster } from "@/lib/exams/queries";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function ReportCardStudentsPage({ params }: { params: Promise<{ examId: string; classId: string }> }) {
  const { examId, classId } = await params;
  const session = await requireSession();

  return (
    <RequirePermission permission="school.manage_exams">
      <Body schoolId={session.schoolId!} examId={examId} classId={classId} />
    </RequirePermission>
  );
}

async function Body({ schoolId, examId, classId }: { schoolId: string; examId: string; classId: string }) {
  const exam = await getExam(schoolId, examId);
  if (!exam || (exam.status !== "approved" && exam.status !== "published")) notFound();

  const students = await getClassRoster(schoolId, classId, exam.academicYearId);

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs
        items={[
          { label: "Exams", href: "/academics/exams/manage" },
          { label: exam.name, href: `/academics/exams/${examId}` },
          { label: "Report Cards", href: `/academics/exams/${examId}/report-cards` },
        ]}
      />
      <h1 className="text-2xl font-semibold">Report Cards</h1>
      {students.length === 0 ? (
        <p className="text-sm text-muted-foreground">No students enrolled in this class.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border bg-card shadow-sm">
          {students.map((s) => (
            <li key={s.studentId}>
              <Link
                href={`/academics/exams/${examId}/report-cards/${classId}/${s.studentId}`}
                className="flex items-center justify-between px-3 py-2 text-sm hover:bg-secondary"
              >
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
