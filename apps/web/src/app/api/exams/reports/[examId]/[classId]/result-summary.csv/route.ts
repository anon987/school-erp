import { NextResponse } from "next/server";
import { getSession } from "@/lib/core/auth/session";
import { hasPermission } from "@/lib/core/auth/permissions";
import { getResultSummaryReport } from "@/lib/exams/queries";
import { buildCsv, csvResponseHeaders } from "@/lib/core/reports/csv";

export async function GET(_request: Request, { params }: { params: Promise<{ examId: string; classId: string }> }) {
  const { examId, classId } = await params;

  const session = await getSession();
  if (!session?.schoolId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!(await hasPermission("school.manage_exams"))) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const summary = await getResultSummaryReport(session.schoolId, examId, classId);
  const csv = buildCsv(
    ["Total Students", "Passed", "Failed", "Average %", "Highest %", "Lowest %"],
    [[summary.totalStudents, summary.passedCount, summary.failedCount, summary.averagePercentage, summary.highestPercentage, summary.lowestPercentage]],
  );

  return new NextResponse(csv, { status: 200, headers: csvResponseHeaders("result-summary.csv") });
}
