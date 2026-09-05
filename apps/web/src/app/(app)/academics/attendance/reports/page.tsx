import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { requireSession } from "@/lib/core/auth/requireSession";
import { hasPermission } from "@/lib/core/auth/permissions";
import { getAttendanceThresholdPercent, getDailyAttendanceSummary, getFlaggedLowAttendanceStudents, listClasses } from "@/lib/attendance/queries";
import { todayIsoIst } from "@/lib/core/dateIst";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EmptyState } from "@/components/EmptyState";
import { ThresholdEditor } from "@/lib/attendance/components/ThresholdEditor";
import { PersonHoverCard } from "@/components/PersonHoverCard";

export default async function AttendanceReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await requireSession();
  const params = await searchParams;
  const attendanceDate = params.date ?? todayIsoIst();
  const classId = params.classId ?? "";
  const flaggedClassId = params.flaggedClassId ?? "";
  const canManage = await hasPermission("attendance.manage");

  const [dailySummary, threshold, flagged, classes] = await Promise.all([
    getDailyAttendanceSummary(session.schoolId!, attendanceDate, classId || undefined),
    getAttendanceThresholdPercent(session.schoolId!),
    getFlaggedLowAttendanceStudents(session.schoolId!, flaggedClassId || undefined),
    listClasses(session.schoolId!),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Attendance", href: "/academics/attendance" }, { label: "Reports" }]} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Attendance Reports</h1>
        <Link href="/academics/attendance/reports/monthly" className="text-sm text-primary underline-offset-2 hover:underline">
          Monthly grid &rarr;
        </Link>
      </div>

      <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Daily summary</h2>
          <a
            href={`/api/attendance/reports/daily.csv?date=${attendanceDate}${classId ? `&classId=${classId}` : ""}`}
            className="text-sm text-primary underline-offset-2 hover:underline"
          >
            Download CSV
          </a>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <form className="flex items-end gap-2" action="/academics/attendance/reports">
            <input type="hidden" name="flaggedClassId" value={flaggedClassId} />
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              Class
              <select name="classId" defaultValue={classId} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">All classes</option>
                {classes.map((c) => (
                  <option key={c.classId} value={c.classId}>
                    {c.className}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              Date
              <input type="date" name="date" defaultValue={attendanceDate} className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </label>
            <button type="submit" className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary">
              Go
            </button>
          </form>
        </div>

        {dailySummary.length === 0 ? (
          <EmptyState icon={AlertTriangle} title="No sections found" description="Set up classes and sections in Master Data first." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                  <th className="px-3 py-2">Class</th>
                  <th className="px-3 py-2">Section</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-right">Marked</th>
                  <th className="px-3 py-2 text-right">Present</th>
                  <th className="px-3 py-2 text-right">Absent</th>
                  <th className="px-3 py-2 text-right">Late</th>
                  <th className="px-3 py-2 text-right">Half-day</th>
                  <th className="px-3 py-2 text-right">Leave</th>
                </tr>
              </thead>
              <tbody>
                {dailySummary.map((row) => (
                  <tr key={row.sectionId} className="border-b border-border last:border-0 hover:bg-secondary/50">
                    <td className="px-3 py-1.5">{row.className}</td>
                    <td className="px-3 py-1.5">{row.sectionName}</td>
                    <td className="font-figures px-3 py-1.5 text-right">{row.totalStudents}</td>
                    <td className="font-figures px-3 py-1.5 text-right">
                      {row.marked === row.totalStudents && row.totalStudents > 0 ? (
                        row.marked
                      ) : (
                        <span className="text-warning-solid">{row.marked}</span>
                      )}
                    </td>
                    <td className="font-figures px-3 py-1.5 text-right">{row.present}</td>
                    <td className="font-figures px-3 py-1.5 text-right">{row.absent}</td>
                    <td className="font-figures px-3 py-1.5 text-right">{row.late}</td>
                    <td className="font-figures px-3 py-1.5 text-right">{row.halfDay}</td>
                    <td className="font-figures px-3 py-1.5 text-right">{row.leave}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Low attendance</h2>
            <p className="text-sm text-muted-foreground">
              Students below the threshold, academic-year-to-date. Half-day counts as half a day present; leave doesn&apos;t count against
              the percentage; declared holidays are excluded.
            </p>
          </div>
          {canManage ? <ThresholdEditor currentPercent={threshold} /> : <span className="font-figures text-sm text-muted-foreground">Threshold: {threshold}%</span>}
        </div>

        <a
          href={`/api/attendance/reports/low-attendance.csv${flaggedClassId ? `?classId=${flaggedClassId}` : ""}`}
          className="self-start text-sm text-primary underline-offset-2 hover:underline"
        >
          Download CSV
        </a>

        <form className="flex items-end gap-2" action="/academics/attendance/reports">
          <input type="hidden" name="date" value={attendanceDate} />
          <input type="hidden" name="classId" value={classId} />
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Class
            <select name="flaggedClassId" defaultValue={flaggedClassId} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c.classId} value={c.classId}>
                  {c.className}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary">
            Filter
          </button>
        </form>

        {flagged.length === 0 ? (
          <p className="text-sm text-muted-foreground">No students are currently below {threshold}%.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                  <th className="px-3 py-2">Admission No.</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Class</th>
                  <th className="px-3 py-2 text-right">Days recorded</th>
                  <th className="px-3 py-2 text-right">Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {flagged.map((row) => (
                  <tr key={row.studentId} className="border-b border-border last:border-0 hover:bg-secondary/50">
                    <td className="font-figures px-3 py-1.5">{row.admissionNumber}</td>
                    <td className="px-3 py-1.5 font-medium">
                      <PersonHoverCard href={`/people/students/${row.studentId}`} photoUrl={row.photoUrl} name={`${row.firstName} ${row.lastName}`}>
                        {row.firstName} {row.lastName}
                      </PersonHoverCard>
                    </td>
                    <td className="px-3 py-1.5">
                      {row.className} - {row.sectionName}
                    </td>
                    <td className="font-figures px-3 py-1.5 text-right">{row.daysMarked}</td>
                    <td className="font-figures px-3 py-1.5 text-right text-danger-solid">{row.percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
