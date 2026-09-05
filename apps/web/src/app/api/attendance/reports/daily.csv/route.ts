import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/core/auth/session";
import { getDailyAttendanceSummary } from "@/lib/attendance/queries";
import { todayIsoIst } from "@/lib/core/dateIst";
import { buildCsv, csvResponseHeaders } from "@/lib/core/reports/csv";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.schoolId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const date = request.nextUrl.searchParams.get("date") || todayIsoIst();
  const classId = request.nextUrl.searchParams.get("classId") || undefined;

  const rows = await getDailyAttendanceSummary(session.schoolId, date, classId);
  const csv = buildCsv(
    ["Class", "Section", "Total", "Marked", "Present", "Absent", "Late", "Half-day", "Leave"],
    rows.map((r) => [r.className, r.sectionName, r.totalStudents, r.marked, r.present, r.absent, r.late, r.halfDay, r.leave]),
  );

  return new NextResponse(csv, { status: 200, headers: csvResponseHeaders(`daily-attendance-${date}.csv`) });
}
