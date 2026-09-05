import { notFound } from "next/navigation";
import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getExam, getExamMarksReport, getResultSummaryReport } from "@/lib/exams/queries";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function ExamClassReportPage({ params }: { params: Promise<{ examId: string; classId: string }> }) {
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
  if (!exam) notFound();

  const [marks, summary] = await Promise.all([getExamMarksReport(schoolId, examId, classId), getResultSummaryReport(schoolId, examId, classId)]);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Exams", href: "/academics/exams/manage" },
          { label: exam.name, href: `/academics/exams/${examId}` },
          { label: "Reports", href: `/academics/exams/${examId}/reports` },
        ]}
      />
      <h1 className="text-2xl font-semibold">{exam.name} — Class Report</h1>

      <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Result Summary</h2>
          <a href={`/api/exams/reports/${examId}/${classId}/result-summary.csv`} className="text-sm text-primary underline-offset-2 hover:underline">
            Download CSV
          </a>
        </div>
        {summary.totalStudents === 0 ? (
          <p className="text-sm text-muted-foreground">No marks entered for this class yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <Stat label="Students" value={summary.totalStudents} />
            <Stat label="Passed" value={summary.passedCount} className="text-success-solid" />
            <Stat label="Failed" value={summary.failedCount} className="text-danger-solid" />
            <Stat label="Average %" value={`${summary.averagePercentage}%`} />
            <Stat label="Highest / Lowest" value={`${summary.highestPercentage}% / ${summary.lowestPercentage}%`} />
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Marks</h2>
          <a href={`/api/exams/reports/${examId}/${classId}/marks.csv`} className="text-sm text-primary underline-offset-2 hover:underline">
            Download CSV
          </a>
        </div>
        {marks.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No students enrolled, or no subjects configured.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-3 py-1.5 font-medium">Admission No.</th>
                  <th className="px-3 py-1.5 font-medium">Name</th>
                  {marks.subjects.map((s) => (
                    <th key={s.subjectId} className="px-3 py-1.5 text-right font-medium">
                      {s.subjectName}
                    </th>
                  ))}
                  <th className="px-3 py-1.5 text-right font-medium">Total</th>
                  <th className="px-3 py-1.5 text-right font-medium">%</th>
                  <th className="px-3 py-1.5 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {marks.rows.map((r) => (
                  <tr key={r.studentId} className="border-b border-border last:border-0">
                    <td className="font-figures px-3 py-1.5">{r.admissionNumber}</td>
                    <td className="px-3 py-1.5">{r.studentName}</td>
                    {marks.subjects.map((s) => (
                      <td key={s.subjectId} className="font-figures px-3 py-1.5 text-right">
                        {r.marksBySubject[s.subjectId] ?? "AB"}
                      </td>
                    ))}
                    <td className="font-figures px-3 py-1.5 text-right">
                      {r.totalObtained}/{r.totalMax}
                    </td>
                    <td className="font-figures px-3 py-1.5 text-right">{r.percentage}%</td>
                    <td className={`px-3 py-1.5 text-xs ${r.passed ? "text-success-solid" : "text-danger-solid"}`}>{r.passed ? "Pass" : "Fail"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: string | number; className?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`font-figures text-xl font-semibold ${className ?? ""}`}>{value}</span>
    </div>
  );
}
