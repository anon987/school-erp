import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getStaffMonthlyAttendance } from "@/lib/attendance/queries";
import { todayIsoIst, monthBoundsIso } from "@/lib/core/dateIst";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import type { AttendanceStatus } from "@/lib/attendance/types";

const STATUS_SHORT: Record<AttendanceStatus, string> = { present: "P", absent: "A", late: "L", half_day: "H", leave: "V" };
const STATUS_CLASS: Record<AttendanceStatus, string> = {
  present: "text-success-solid",
  absent: "text-danger-solid",
  late: "text-warning-solid",
  half_day: "text-warning-solid",
  leave: "text-info-solid",
};

export default async function StaffAttendanceReportPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await requireSession();

  return (
    <RequirePermission permission="attendance.manage">
      <Body schoolId={session.schoolId!} searchParams={searchParams} />
    </RequirePermission>
  );
}

async function Body({ schoolId, searchParams }: { schoolId: string; searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const month = params.month ?? todayIsoIst().slice(0, 7);
  const { start, end, days } = monthBoundsIso(month);
  const rows = await getStaffMonthlyAttendance(schoolId, start, end);
  const dayNumbers = Array.from({ length: days }, (_, i) => i + 1);

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: "Attendance", href: "/academics/attendance" }, { label: "Staff", href: "/academics/attendance/staff" }, { label: "Reports" }]} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Staff Attendance</h1>
        <a href={`/api/attendance/reports/staff-monthly.csv?month=${month}`} className="text-sm text-primary underline-offset-2 hover:underline">
          Download CSV
        </a>
      </div>

      <form className="flex items-end gap-2 rounded-md border border-border bg-card p-3 shadow-sm" action="/academics/attendance/staff/reports">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Month
          <input type="month" name="month" defaultValue={month} className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </label>
        <button type="submit" className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary">
          Go
        </button>
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active staff, or no attendance recorded this month.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-card shadow-sm">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left font-medium text-muted-foreground">
                <th className="sticky left-0 bg-card px-3 py-2">Staff</th>
                {dayNumbers.map((d) => (
                  <th key={d} className="font-figures px-1.5 py-2 text-center">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.staffId} className="border-b border-border last:border-0 hover:bg-secondary/50">
                  <td className="sticky left-0 bg-card px-3 py-1.5 font-medium">
                    {row.firstName} {row.lastName}
                  </td>
                  {dayNumbers.map((d) => {
                    const dateIso = `${month}-${String(d).padStart(2, "0")}`;
                    const status = row.statusByDate[dateIso];
                    return (
                      <td key={d} className={`font-figures px-1.5 py-1.5 text-center ${status ? STATUS_CLASS[status] : "text-muted-foreground"}`}>
                        {status ? STATUS_SHORT[status] : "-"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
