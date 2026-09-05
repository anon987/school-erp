import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/core/auth/session";
import { getFlaggedLowAttendanceStudents } from "@/lib/attendance/queries";
import { buildCsv, csvResponseHeaders } from "@/lib/core/reports/csv";
import { todayIsoIst } from "@/lib/core/dateIst";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.schoolId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const classId = request.nextUrl.searchParams.get("classId") || undefined;
  const rows = await getFlaggedLowAttendanceStudents(session.schoolId, classId);
  const csv = buildCsv(
    ["Admission No.", "Name", "Class", "Section", "Days Recorded", "Attendance %"],
    rows.map((r) => [r.admissionNumber, `${r.firstName} ${r.lastName}`, r.className, r.sectionName, r.daysMarked, r.percent]),
  );

  return new NextResponse(csv, { status: 200, headers: csvResponseHeaders(`low-attendance-${todayIsoIst()}.csv`) });
}
