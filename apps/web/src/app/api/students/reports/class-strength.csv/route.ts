import { NextResponse } from "next/server";
import { getSession } from "@/lib/core/auth/session";
import { hasPermission } from "@/lib/core/auth/permissions";
import { getClassStrengthReport } from "@/lib/students/queries";
import { getCurrentAcademicYearId } from "@/lib/core/school/getCurrentAcademicYear";
import { buildCsv, csvResponseHeaders } from "@/lib/core/reports/csv";

export async function GET() {
  const session = await getSession();
  if (!session?.schoolId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!(await hasPermission("school.manage_students"))) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const academicYearId = await getCurrentAcademicYearId(session.schoolId);
  const rows = academicYearId ? await getClassStrengthReport(session.schoolId, academicYearId) : [];

  const csv = buildCsv(
    ["Class", "Section", "Male", "Female", "Other", "Total"],
    rows.map((r) => [r.className, r.sectionName, r.male, r.female, r.other, r.total]),
  );

  return new NextResponse(csv, { status: 200, headers: csvResponseHeaders("class-strength.csv") });
}
