import { NextResponse } from "next/server";
import { getSession } from "@/lib/core/auth/session";
import { hasPermission } from "@/lib/core/auth/permissions";
import { getStudentMasterReport } from "@/lib/students/queries";
import { getCurrentAcademicYearId } from "@/lib/core/school/getCurrentAcademicYear";
import { formatDateDisplay } from "@/lib/core/dateIst";
import { buildCsv, csvResponseHeaders } from "@/lib/core/reports/csv";

export async function GET() {
  const session = await getSession();
  if (!session?.schoolId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!(await hasPermission("school.manage_students"))) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const academicYearId = await getCurrentAcademicYearId(session.schoolId);
  const rows = academicYearId ? await getStudentMasterReport(session.schoolId, academicYearId) : [];

  const csv = buildCsv(
    ["Admission No.", "First Name", "Last Name", "Class", "Section", "Roll No.", "DOB", "Gender", "Father", "Contact", "Status"],
    rows.map((r) => [
      r.admissionNumber,
      r.firstName,
      r.lastName,
      r.className,
      r.sectionName,
      r.rollNumber ?? "",
      r.dob ? formatDateDisplay(r.dob) : "",
      r.gender ?? "",
      r.fatherName ?? "",
      r.contactPhone ?? "",
      r.status,
    ]),
  );

  return new NextResponse(csv, { status: 200, headers: csvResponseHeaders("student-master.csv") });
}
