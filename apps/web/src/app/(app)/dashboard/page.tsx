import { Boxes } from "lucide-react";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getDashboardOverview } from "@/lib/dashboard/queries";
import { TrendChart } from "@/lib/dashboard/components/TrendChart";
import { AlertsSection } from "@/lib/dashboard/components/AlertsSection";
import { EmptyState } from "@/components/EmptyState";

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-4 shadow-sm">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-figures text-3xl font-semibold">{value}</span>
      {sub ? <span className="font-figures text-xs text-muted-foreground">{sub}</span> : null}
    </div>
  );
}

function rupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default async function DashboardPage() {
  const session = await requireSession();
  const overview = await getDashboardOverview(session.schoolId!);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Students enrolled" value={overview.studentCount.toLocaleString("en-IN")} />
        <KpiCard label="Staff" value={overview.staffCount.toLocaleString("en-IN")} />
        <KpiCard label="Today's attendance" value={overview.todayAttendancePercent !== null ? `${overview.todayAttendancePercent}%` : "—"} />
        <KpiCard label="Staff attendance" value={overview.todayStaffAttendancePercent !== null ? `${overview.todayStaffAttendancePercent}%` : "—"} />
        <KpiCard label="Collected today" value={rupees(overview.feesCollectedTodayPaise)} sub={`${rupees(overview.feesCollectedMonthToDatePaise)} this month`} />
        <KpiCard label="Pending dues" value={rupees(overview.pendingDuesPaise)} sub={`${overview.defaulterCount} student(s)`} />
      </div>

      <AlertsSection lowAttendance={overview.lowAttendanceAlerts} largeDues={overview.largeDuesAlerts} resultsPendingApproval={overview.resultsPendingApproval} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TrendChart title="Attendance % — last 7 days" points={overview.attendanceTrend} formatValue={(v) => `${v}%`} />
        <TrendChart title="Fees collected — last 7 days" points={overview.collectionTrend} formatValue={(v) => rupees(v)} />
        <TrendChart title="New admissions — last 7 days" points={overview.admissionsTrend} formatValue={(v) => `${v}`} />
      </div>

      <div className="rounded-md border border-border bg-card shadow-sm">
        <h2 className="border-b border-border px-4 py-3 text-lg font-semibold">Classes &amp; sections</h2>
        {overview.classes.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No classes configured yet"
            description="Set up classes and sections in Master Data to see the school's structure here."
            action={{ label: "Go to Master Data", href: "/settings/master-data" }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary text-left text-secondary-foreground">
                  <th className="px-3 py-2 font-medium">Class</th>
                  <th className="px-3 py-2 text-right font-medium">Sections</th>
                  <th className="px-3 py-2 text-right font-medium">Students</th>
                </tr>
              </thead>
              <tbody>
                {overview.classes.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary/50">
                    <td className="px-3 py-1.5 font-medium">{c.name}</td>
                    <td className="font-figures px-3 py-1.5 text-right text-muted-foreground">{c.sectionCount}</td>
                    <td className="font-figures px-3 py-1.5 text-right">{c.studentCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
