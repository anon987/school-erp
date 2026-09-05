import Link from "next/link";
import { requireSession } from "@/lib/core/auth/requireSession";
import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { getStaffRoster } from "@/lib/attendance/queries";
import { todayIsoIst } from "@/lib/core/dateIst";
import { StaffMarkingClient } from "@/lib/attendance/components/StaffMarkingClient";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function StaffAttendancePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await requireSession();
  const params = await searchParams;
  const attendanceDate = params.date ?? todayIsoIst();

  return (
    <RequirePermission permission="attendance.manage">
      <StaffAttendanceBody schoolId={session.schoolId!} attendanceDate={attendanceDate} />
    </RequirePermission>
  );
}

async function StaffAttendanceBody({ schoolId, attendanceDate }: { schoolId: string; attendanceDate: string }) {
  const roster = await getStaffRoster(schoolId, attendanceDate);

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: "Attendance", href: "/academics/attendance" }, { label: "Staff" }]} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Staff Attendance</h1>
        <Link href="/academics/attendance/staff/reports" className="text-sm text-primary underline-offset-2 hover:underline">
          Monthly report &rarr;
        </Link>
      </div>

      <form className="flex items-end gap-3 rounded-md border border-border bg-card p-3 shadow-sm" action="/academics/attendance/staff">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Date
          <input type="date" name="date" defaultValue={attendanceDate} className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </label>
        <button type="submit" className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary">
          Go
        </button>
      </form>

      <StaffMarkingClient staff={roster} attendanceDate={attendanceDate} />
    </div>
  );
}
