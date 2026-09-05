import Link from "next/link";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getPermissions } from "@/lib/core/auth/permissions";
import { getCurrentAcademicYearId } from "@/lib/core/school/getCurrentAcademicYear";
import { getExamDashboardStats } from "@/lib/exams/dashboard.queries";
import { TrendChart } from "@/lib/dashboard/components/TrendChart";
import { DonutChart } from "@/lib/exams/components/DonutChart";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import type { ExamStatus } from "@/lib/exams/types";

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-4 shadow-sm">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-figures text-3xl font-semibold">{value}</span>
      {sub ? <span className="font-figures text-xs text-muted-foreground">{sub}</span> : null}
    </div>
  );
}

const STATUS_LABELS: Record<ExamStatus, string> = {
  draft: "Draft",
  marks_entry: "Marks entry",
  pending_approval: "Pending approval",
  approved: "Approved",
  published: "Published",
};

const STATUS_COLORS: Record<ExamStatus, "success" | "danger" | "warning" | "info"> = {
  draft: "info",
  marks_entry: "warning",
  pending_approval: "info",
  approved: "success",
  published: "success",
};

export default async function ExamDashboardPage() {
  const session = await requireSession();
  const permissions = await getPermissions();
  const canManage = permissions.includes("school.manage_exams");
  const academicYearId = await getCurrentAcademicYearId(session.schoolId!);

  if (!academicYearId) {
    return (
      <div className="flex flex-col gap-4">
        <Breadcrumbs items={[{ label: "Exams" }]} />
        <p className="text-sm text-muted-foreground">No current academic year set -- configure one in Master Data first.</p>
      </div>
    );
  }

  const stats = await getExamDashboardStats(session.schoolId!, academicYearId);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Exams" }]} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Exam Dashboard</h1>
          <p className="text-sm text-muted-foreground">Set up exams, schedule papers, enter marks, and generate report cards.</p>
        </div>
        {canManage ? (
          <Link href="/academics/exams/manage" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            Manage Exams
          </Link>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Exams this session" value={stats.examsThisSessionCount.toLocaleString("en-IN")} />
        <KpiCard label="Upcoming exams" value={stats.upcomingCount.toLocaleString("en-IN")} sub={`${stats.ongoingCount} ongoing now`} />
        <KpiCard label="Marks entry" value={`${stats.marksEntryPercent}%`} sub="of class-subject distributions scored" />
        <KpiCard label="Published report cards" value={stats.publishedSetupsCount.toLocaleString("en-IN")} />
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Overall Marks Entry Progress</h3>
          <span className="font-figures text-sm font-semibold text-success-solid">{stats.marksEntryPercent}%</span>
        </div>
        <p className="text-xs text-muted-foreground">Percentage of class-subject distributions that have marks entered.</p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-success-solid" style={{ width: `${stats.marksEntryPercent}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TrendChart title="Upcoming exam schedule (next 15 days)" points={stats.upcomingSchedule} formatValue={(v) => `${v} exam(s)`} />
        <DonutChart
          title="By status"
          segments={stats.statusBreakdown.map((s) => ({ label: STATUS_LABELS[s.status], value: s.count, colorVar: STATUS_COLORS[s.status] }))}
        />
        <DonutChart
          title="Marks entry attendance"
          segments={[
            { label: "Present", value: stats.attendanceBreakdown.present, colorVar: "success" },
            { label: "Absent", value: stats.attendanceBreakdown.absent, colorVar: "danger" },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link href="/academics/exams/manage" className="rounded-md border border-border bg-card px-4 py-3 text-sm font-medium shadow-sm hover:bg-secondary">
          Manage Exams
        </Link>
        <Link href="/academics/exams/report-cards" className="rounded-md border border-border bg-card px-4 py-3 text-sm font-medium shadow-sm hover:bg-secondary">
          Report Cards
        </Link>
        <Link href="/academics/exams/admit-card-settings" className="rounded-md border border-border bg-card px-4 py-3 text-sm font-medium shadow-sm hover:bg-secondary">
          Admit Card Settings
        </Link>
      </div>
    </div>
  );
}
