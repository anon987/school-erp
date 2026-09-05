import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/core/auth/session";
import { hasPermission } from "@/lib/core/auth/permissions";
import { getStaffMonthlyAttendance } from "@/lib/attendance/queries";
import { buildCsv, csvResponseHeaders } from "@/lib/core/reports/csv";
import { todayIsoIst, monthBoundsIso } from "@/lib/core/dateIst";
import type { AttendanceStatus } from "@/lib/attendance/types";

const STATUS_SHORT: Record<AttendanceStatus, string> = { present: "P", absent: "A", late: "L", half_day: "H", leave: "V" };

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.schoolId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!(await hasPermission("attendance.manage"))) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const month = request.nextUrl.searchParams.get("month") || todayIsoIst().slice(0, 7);
  const { start, end, days } = monthBoundsIso(month);
  const rows = await getStaffMonthlyAttendance(session.schoolId, start, end);
  const dayNumbers = Array.from({ length: days }, (_, i) => i + 1);

  const csv = buildCsv(
    ["Employee Code", "Staff", ...dayNumbers.map(String)],
    rows.map((r) => [
      r.employeeCode,
      `${r.firstName} ${r.lastName}`,
      ...dayNumbers.map((d) => {
        const dateIso = `${month}-${String(d).padStart(2, "0")}`;
        const status = r.statusByDate[dateIso];
        return status ? STATUS_SHORT[status] : "";
      }),
    ]),
  );

  return new NextResponse(csv, { status: 200, headers: csvResponseHeaders(`staff-attendance-${month}.csv`) });
}
