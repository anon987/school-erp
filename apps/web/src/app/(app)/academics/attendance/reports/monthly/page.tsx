import { requireSession } from "@/lib/core/auth/requireSession";
import { getMonthlySummary, listAllSections } from "@/lib/attendance/queries";
import { todayIsoIst, monthBoundsIso } from "@/lib/core/dateIst";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PersonHoverCard } from "@/components/PersonHoverCard";
import { MonthlyPickerBar } from "@/lib/attendance/components/MonthlyPickerBar";
import type { AttendanceStatus } from "@/lib/attendance/types";

const STATUS_SHORT: Record<AttendanceStatus, string> = { present: "P", absent: "A", late: "L", half_day: "H", leave: "V" };
const STATUS_CLASS: Record<AttendanceStatus, string> = {
  present: "text-success-solid",
  absent: "text-danger-solid",
  late: "text-warning-solid",
  half_day: "text-warning-solid",
  leave: "text-info-solid",
};

export default async function MonthlyAttendanceReportPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await requireSession();
  const params = await searchParams;
  const sections = await listAllSections(session.schoolId!);
  const sectionId = params.sectionId ?? sections[0]?.sectionId;
  const month = params.month ?? todayIsoIst().slice(0, 7);
  const { start, end, days } = monthBoundsIso(month);

  const rows = sectionId ? await getMonthlySummary(session.schoolId!, sectionId, start, end) : [];
  const dayNumbers = Array.from({ length: days }, (_, i) => i + 1);

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: "Attendance", href: "/academics/attendance" }, { label: "Reports", href: "/academics/attendance/reports" }, { label: "Monthly" }]} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Monthly Attendance</h1>
        {sectionId ? (
          <a href={`/api/attendance/reports/monthly.csv?sectionId=${sectionId}&month=${month}`} className="text-sm text-primary underline-offset-2 hover:underline">
            Download CSV
          </a>
        ) : null}
      </div>

      {sectionId ? <MonthlyPickerBar sections={sections} sectionId={sectionId} month={month} /> : null}

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No students enrolled in this section, or no attendance recorded this month.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-card shadow-sm">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left font-medium text-muted-foreground">
                <th className="sticky left-0 bg-card px-3 py-2">Student</th>
                {dayNumbers.map((d) => (
                  <th key={d} className="font-figures px-1.5 py-2 text-center">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.studentId} className="border-b border-border last:border-0 hover:bg-secondary/50">
                  <td className="sticky left-0 bg-card px-3 py-1.5 font-medium">
                    <PersonHoverCard href={`/people/students/${row.studentId}`} photoUrl={row.photoUrl} name={`${row.firstName} ${row.lastName}`}>
                      {row.firstName} {row.lastName}
                    </PersonHoverCard>
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
