import { NextResponse } from "next/server";
import { getSession } from "@/lib/core/auth/session";
import { hasPermission } from "@/lib/core/auth/permissions";
import { getDefaulters } from "@/lib/fees/queries";
import { getCurrentAcademicYearId } from "@/lib/core/school/getCurrentAcademicYear";
import { buildCsv, csvResponseHeaders } from "@/lib/core/reports/csv";

export async function GET() {
  const session = await getSession();
  if (!session?.schoolId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!(await hasPermission("school.manage_fees"))) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const academicYearId = await getCurrentAcademicYearId(session.schoolId);
  const rows = academicYearId ? await getDefaulters(session.schoolId, academicYearId) : [];

  const csv = buildCsv(
    ["Admission No.", "Name", "Class", "Section", "Overdue Invoices", "Amount Due (paise)"],
    rows.map((r) => [r.admissionNumber, `${r.firstName} ${r.lastName}`, r.className, r.sectionName, r.overdueInvoiceCount, r.dueAmountPaise]),
  );

  return new NextResponse(csv, { status: 200, headers: csvResponseHeaders("dues-and-defaulters.csv") });
}
