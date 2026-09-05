import { NextResponse } from "next/server";
import { getSession } from "@/lib/core/auth/session";
import { hasPermission } from "@/lib/core/auth/permissions";
import { getConcessionsReport } from "@/lib/fees/queries";
import { getCurrentAcademicYearId } from "@/lib/core/school/getCurrentAcademicYear";
import { buildCsv, csvResponseHeaders } from "@/lib/core/reports/csv";

export async function GET() {
  const session = await getSession();
  if (!session?.schoolId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!(await hasPermission("school.manage_fees"))) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const academicYearId = await getCurrentAcademicYearId(session.schoolId);
  const rows = academicYearId ? await getConcessionsReport(session.schoolId, academicYearId) : [];

  const csv = buildCsv(
    ["Admission No.", "Student", "Class", "Section", "Fee Head", "Concession (paise)"],
    rows.map((r) => [r.admissionNumber, r.studentName, r.className, r.sectionName, r.feeHeadName, r.totalConcessionPaise]),
  );

  return new NextResponse(csv, { status: 200, headers: csvResponseHeaders("concessions.csv") });
}
