import Link from "next/link";
import { notFound } from "next/navigation";
import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getExam, getExamClasses } from "@/lib/exams/queries";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function ReportCardClassesPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const session = await requireSession();

  return (
    <RequirePermission permission="school.manage_exams">
      <Body schoolId={session.schoolId!} examId={examId} />
    </RequirePermission>
  );
}

async function Body({ schoolId, examId }: { schoolId: string; examId: string }) {
  const exam = await getExam(schoolId, examId);
  if (!exam) notFound();
  if (exam.status !== "approved" && exam.status !== "published") {
    return (
      <div className="flex flex-col gap-4">
        <Breadcrumbs items={[{ label: "Exams", href: "/academics/exams/manage" }, { label: exam.name, href: `/academics/exams/${examId}` }, { label: "Report Cards" }]} />
        <p className="text-sm text-muted-foreground">Report cards are available once results are approved.</p>
      </div>
    );
  }

  const classes = await getExamClasses(examId);

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: "Exams", href: "/academics/exams/manage" }, { label: exam.name, href: `/academics/exams/${examId}` }, { label: "Report Cards" }]} />
      <h1 className="text-2xl font-semibold">Report Cards — {exam.name}</h1>
      {classes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No subjects were configured for this exam.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {classes.map((c) => (
            <li key={c.id}>
              <Link
                href={`/academics/exams/${examId}/report-cards/${c.id}`}
                className="block rounded-md border border-border bg-card px-4 py-3 shadow-sm hover:bg-secondary"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
