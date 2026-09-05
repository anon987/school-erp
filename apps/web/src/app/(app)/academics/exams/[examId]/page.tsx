import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getPermissions } from "@/lib/core/auth/permissions";
import { getExam, getExamSubjects, getExamApplicableClasses, getSubjectOptions } from "@/lib/exams/queries";
import { deleteExamAction, deleteExamSubjectAction } from "@/lib/exams/actions";
import { AddExamSubjectForm } from "@/lib/exams/components/AddExamSubjectForm";
import { ExamStatusControls } from "@/lib/exams/components/ExamStatusControls";
import { ExamsDeleteButton } from "@/lib/exams/components/ExamsDeleteButton";
import { ExamSubjectScheduleForm } from "@/lib/exams/components/ExamSubjectScheduleForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { formatDateDisplay } from "@/lib/core/dateIst";

export default async function ExamDetailPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const session = await requireSession();
  const permissions = await getPermissions();
  const canManage = permissions.includes("school.manage_exams");
  const canApprove = permissions.includes("school.approve_exam_results");

  const exam = await getExam(session.schoolId!, examId);
  if (!exam) notFound();

  const [subjects, classes, subjectOptions] = await Promise.all([
    getExamSubjects(session.schoolId!, examId, exam.academicYearId),
    getExamApplicableClasses(session.schoolId!, examId),
    getSubjectOptions(session.schoolId!),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: "Exams", href: "/academics/exams/manage" }, { label: exam.name }]} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{exam.name}</h1>
          <p className="text-sm text-muted-foreground">
            {exam.term ? `${exam.term} · ` : ""}
            {exam.startDate ? formatDateDisplay(exam.startDate) : "—"} to {exam.endDate ? formatDateDisplay(exam.endDate) : "—"}
          </p>
        </div>
        {canManage || canApprove ? <ExamStatusControls examId={exam.id} status={exam.status} canApprove={canApprove} /> : null}
      </div>

      <div className="flex gap-2">
        {(exam.status === "approved" || exam.status === "published") && canManage ? (
          <Link href={`/academics/exams/${exam.id}/report-cards`} className="self-start rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary">
            View report cards
          </Link>
        ) : null}
        {canManage ? (
          <Link href={`/academics/exams/${exam.id}/admit-cards`} className="self-start rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary">
            Admit Cards
          </Link>
        ) : null}
        {canManage ? (
          <Link href={`/academics/exams/${exam.id}/reports`} className="self-start rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary">
            Marks &amp; Result Reports
          </Link>
        ) : null}
      </div>

      {exam.status === "draft" && canManage ? (
        <ExamsDeleteButton action={deleteExamAction.bind(null, exam.id)} />
      ) : null}

      <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Subjects</h2>
        {subjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No subjects added yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-1 pr-3 font-medium">Class</th>
                <th className="py-1 pr-3 font-medium">Subject</th>
                <th className="py-1 pr-3 text-right font-medium">Max</th>
                <th className="py-1 pr-3 text-right font-medium">Pass</th>
                <th className="py-1 pr-3 text-right font-medium">Entered</th>
                <th className="py-1 pr-3 font-medium">Schedule</th>
                <th className="py-1 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="py-1.5 pr-3">{s.className}</td>
                  <td className="py-1.5 pr-3">
                    {s.subjectName}
                    {s.hasInternal ? <span className="ml-1 text-xs text-muted-foreground">(+{s.internalMaxMarks} internal)</span> : null}
                  </td>
                  <td className="font-figures py-1.5 pr-3 text-right">{s.maxMarks}</td>
                  <td className="font-figures py-1.5 pr-3 text-right">{s.passMarks}</td>
                  <td className="font-figures py-1.5 pr-3 text-right">
                    {s.enteredCount} / {s.totalStudentCount}
                  </td>
                  <td className="py-1.5 pr-3">
                    {canManage ? (
                      <ExamSubjectScheduleForm examId={exam.id} examSubjectId={s.id} examDate={s.examDate} startTime={s.startTime} endTime={s.endTime} roomNo={s.roomNo} />
                    ) : (
                      <span className="text-xs text-muted-foreground">{s.examDate ?? "Not scheduled"}</span>
                    )}
                  </td>
                  <td className="py-1.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canManage && exam.status === "marks_entry" ? (
                        <Link href={`/academics/exams/${exam.id}/marks/${s.id}`} className="text-sm text-primary underline-offset-2 hover:underline">
                          Enter marks
                        </Link>
                      ) : null}
                      {canManage && exam.status === "draft" ? <ExamsDeleteButton action={deleteExamSubjectAction.bind(null, exam.id, s.id)} /> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {canManage && (exam.status === "draft" || exam.status === "marks_entry") ? (
          <AddExamSubjectForm examId={exam.id} classes={classes} subjects={subjectOptions} />
        ) : null}
      </section>
    </div>
  );
}
