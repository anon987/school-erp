import { requireSession } from "@/lib/core/auth/requireSession";
import { hasPermission } from "@/lib/core/auth/permissions";
import { getMarkableSections, getSectionRoster, type MarkableSection } from "@/lib/attendance/queries";
import { todayIsoIst } from "@/lib/core/dateIst";
import { MarkingClient } from "@/lib/attendance/components/MarkingClient";
import { AttendancePickerBar } from "@/lib/attendance/components/AttendancePickerBar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EmptyState } from "@/components/EmptyState";
import { ClipboardX } from "lucide-react";

export default async function MarkAttendancePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await requireSession();
  const params = await searchParams;
  const canManage = await hasPermission("attendance.manage");
  const canMarkOwnClass = await hasPermission("attendance.mark_own_class");

  if (!canManage && !canMarkOwnClass) {
    return (
      <p role="alert" className="rounded-md bg-danger px-3 py-2 text-sm text-danger-foreground">
        You do not have permission to mark attendance.
      </p>
    );
  }

  const sections = await getMarkableSections(session.schoolId!);
  const attendanceDate = params.date ?? todayIsoIst();
  const sectionId = params.sectionId ?? sections[0]?.sectionId;

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: "Attendance", href: "/academics/attendance" }, { label: "Mark" }]} />
      <h1 className="text-2xl font-semibold">Mark Attendance</h1>

      {sections.length === 0 ? (
        <EmptyState
          icon={ClipboardX}
          title="No section assigned"
          description="You're not set as the class teacher of any section yet. Ask a school admin to assign you in Master Data."
        />
      ) : !sectionId ? (
        <p className="text-sm text-muted-foreground">Choose a section to begin.</p>
      ) : (
        <MarkAttendanceBody
          schoolId={session.schoolId!}
          authUserId={session.authUserId}
          sections={sections}
          sectionId={sectionId}
          attendanceDate={attendanceDate}
          canManage={canManage}
        />
      )}
    </div>
  );
}

async function MarkAttendanceBody({
  schoolId,
  authUserId,
  sections,
  sectionId,
  attendanceDate,
  canManage,
}: {
  schoolId: string;
  authUserId: string;
  sections: MarkableSection[];
  sectionId: string;
  attendanceDate: string;
  canManage: boolean;
}) {
  const roster = await getSectionRoster(schoolId, sectionId, attendanceDate);

  return (
    <div className="flex flex-col gap-4">
      <AttendancePickerBar sections={sections} sectionId={sectionId} attendanceDate={attendanceDate} canManage={canManage} />
      <MarkingClient roster={roster} canForceEdit={canManage} authUserId={authUserId} />
    </div>
  );
}
