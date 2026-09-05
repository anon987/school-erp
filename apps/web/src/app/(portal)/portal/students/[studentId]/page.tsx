import { notFound } from "next/navigation";
import { StatusBadge } from "@schoolerp/ui";
import { requirePortalSession } from "@/lib/core/auth/portalSession";
import { getLinkedStudents, getPortalExamsForStudent, getLeaveApplications, getPortalTimetableForStudent } from "@/lib/portal/queries";
import { PortalTimetableView } from "@/lib/portal/components/PortalTimetableView";
import { getStudentAttendanceSummary } from "@/lib/attendance/queries";
import { StudentFeesPanel } from "@/lib/fees/components/StudentFeesPanel";
import { PortalHeader } from "@/lib/portal/components/PortalHeader";
import { LeaveApplicationForm } from "@/lib/portal/components/LeaveApplicationForm";
import { getPortalHomework } from "@/lib/homework/queries";
import { SubmitHomeworkForm } from "@/lib/homework/components/SubmitHomeworkForm";
import { Tabs } from "@/components/Tabs";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { formatDateDisplay, formatDateTimeDisplayIst } from "@/lib/core/dateIst";

const ATTENDANCE_BADGE: Record<string, "present" | "absent" | "late" | "half_day" | "leave"> = {
  present: "present",
  absent: "absent",
  late: "late",
  half_day: "half_day",
  leave: "leave",
};

const LEAVE_BADGE: Record<string, "pending" | "approved" | "due"> = {
  pending: "pending",
  approved: "approved",
  rejected: "due",
};

const HOMEWORK_BADGE: Record<string, "pending" | "due" | "approved"> = { pending: "pending", submitted: "due", reviewed: "approved" };

export default async function PortalStudentPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const session = await requirePortalSession();

  const linkedStudents = await getLinkedStudents(session.schoolId, session.guardianId);
  const student = linkedStudents.find((s) => s.id === studentId);
  if (!student) notFound();

  const [attendance, exams, leaveApplications, homework, timetable] = await Promise.all([
    getStudentAttendanceSummary(session.schoolId, studentId),
    getPortalExamsForStudent(studentId),
    getLeaveApplications(studentId),
    getPortalHomework(studentId),
    getPortalTimetableForStudent(session.schoolId, studentId),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <PortalHeader schoolId={session.schoolId} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4">
        <Breadcrumbs items={[{ label: "Your children", href: "/portal" }, { label: `${student.firstName} ${student.lastName}` }]} />
        <h1 className="text-xl font-semibold">
          {student.firstName} {student.lastName}
        </h1>
        <p className="text-sm text-muted-foreground">
          {student.className ? `${student.className}${student.sectionName ? ` - ${student.sectionName}` : ""}` : "—"} · Admission no.{" "}
          {student.admissionNumber}
        </p>

        <Tabs
          tabs={[
            {
              id: "attendance",
              label: "Attendance",
              content: (
                <div className="flex flex-col gap-3">
                  <p className="text-sm">
                    {attendance.percent !== null ? (
                      <>
                        <span className="font-figures font-semibold">{attendance.percent}%</span> present ({attendance.daysMarked} days marked)
                      </>
                    ) : (
                      "No attendance marked yet."
                    )}
                  </p>
                  <div className="overflow-x-auto rounded-md border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendance.history.slice(0, 60).map((row) => (
                          <tr key={row.attendanceDate} className="border-b border-border last:border-0">
                            <td className="px-3 py-1.5 font-figures">{formatDateDisplay(row.attendanceDate)}</td>
                            <td className="px-3 py-1.5">
                              <StatusBadge state={ATTENDANCE_BADGE[row.status] ?? "present"} label={row.status.replace("_", " ")} />
                            </td>
                            <td className="px-3 py-1.5 text-muted-foreground">{row.remarks ?? "—"}</td>
                          </tr>
                        ))}
                        {attendance.history.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-3 py-6 text-center text-sm text-muted-foreground">
                              No records yet.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              ),
            },
            {
              id: "fees",
              label: "Fees",
              content: <StudentFeesPanel schoolId={session.schoolId} studentId={studentId} canManage={false} />,
            },
            {
              id: "results",
              label: "Results",
              content: (
                <div className="flex flex-col gap-2">
                  {exams.length > 0 ? (
                    <ul className="flex flex-col gap-2">
                      {exams.map((e) => (
                        <li key={e.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                          <span>
                            {e.name}
                            {e.term ? ` (${e.term})` : ""}
                          </span>
                          <a
                            href={`/api/portal/report-cards/${e.id}/${studentId}/pdf`}
                            className="rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary"
                          >
                            Download report card
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No published results yet.</p>
                  )}
                </div>
              ),
            },
            {
              id: "leave",
              label: "Leave",
              content: (
                <div className="flex flex-col gap-4">
                  <LeaveApplicationForm studentId={studentId} />
                  <ul className="flex flex-col gap-2">
                    {leaveApplications.map((l) => (
                      <li key={l.id} className="flex flex-col gap-1 rounded-md border border-border px-3 py-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span>
                            {formatDateDisplay(l.fromDate)} - {formatDateDisplay(l.toDate)}
                          </span>
                          <StatusBadge state={LEAVE_BADGE[l.status] ?? "pending"} label={l.status} />
                        </div>
                        <p className="text-muted-foreground">{l.reason}</p>
                        <p className="text-xs text-muted-foreground">Submitted {formatDateTimeDisplayIst(l.createdAt)}</p>
                      </li>
                    ))}
                    {leaveApplications.length === 0 ? <p className="text-sm text-muted-foreground">No leave requests yet.</p> : null}
                  </ul>
                </div>
              ),
            },
            {
              id: "timetable",
              label: "Timetable",
              content: timetable ? (
                <PortalTimetableView periods={timetable.periods} slots={timetable.slots} />
              ) : (
                <p className="text-sm text-muted-foreground">No timetable available -- not enrolled in the current academic year.</p>
              ),
            },
            {
              id: "homework",
              label: "Homework",
              content: (
                <div className="flex flex-col gap-3">
                  {homework.length > 0 ? (
                    homework.map((h) => (
                      <div key={h.submissionId} className="flex flex-col gap-2 rounded-md border border-border bg-card p-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {h.title} <span className="text-xs font-normal text-muted-foreground">({h.subjectName})</span>
                          </span>
                          <StatusBadge state={HOMEWORK_BADGE[h.status] ?? "pending"} label={h.status} />
                        </div>
                        <p className="text-sm text-muted-foreground">{h.description}</p>
                        <p className="text-xs text-muted-foreground">Due {formatDateDisplay(h.dueDate)}</p>
                        {h.status === "pending" ? (
                          <SubmitHomeworkForm submissionId={h.submissionId} />
                        ) : (
                          <div className="rounded-md bg-secondary/50 p-2 text-xs">
                            {h.content ? <p>{h.content}</p> : null}
                            {h.teacherRemarks ? (
                              <p className="mt-1 text-muted-foreground">
                                <strong>Teacher:</strong> {h.teacherRemarks}
                              </p>
                            ) : null}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No homework yet.</p>
                  )}
                </div>
              ),
            },
          ]}
        />
      </main>
    </div>
  );
}
