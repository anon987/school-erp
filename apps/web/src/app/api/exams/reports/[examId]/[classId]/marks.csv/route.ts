import { NextResponse } from "next/server";
import { getSession } from "@/lib/core/auth/session";
import { hasPermission } from "@/lib/core/auth/permissions";
import { getExamMarksReport } from "@/lib/exams/queries";
import { buildCsv, csvResponseHeaders } from "@/lib/core/reports/csv";

export async function GET(_request: Request, { params }: { params: Promise<{ examId: string; classId: string }> }) {
  const { examId, classId } = await params;

  const session = await getSession();
  if (!session?.schoolId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!(await hasPermission("school.manage_exams"))) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const report = await getExamMarksReport(session.schoolId, examId, classId);
  const csv = buildCsv(
    ["Admission No.", "Name", ...report.subjects.map((s) => s.subjectName), "Total Obtained", "Total Max", "Percentage", "Result"],
    report.rows.map((r) => [
      r.admissionNumber,
      r.studentName,
      ...report.subjects.map((s) => r.marksBySubject[s.subjectId] ?? "AB"),
      r.totalObtained,
      r.totalMax,
      r.percentage,
      r.passed ? "Pass" : "Fail",
    ]),
  );

  return new NextResponse(csv, { status: 200, headers: csvResponseHeaders("exam-marks.csv") });
}
