import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, IdCard } from "lucide-react";
import { StatusBadge } from "@schoolerp/ui";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getPermissions } from "@/lib/core/auth/permissions";
import { getStudent } from "@/lib/students/queries";
import { studentStatusBadgeState } from "@/lib/students/statusBadge";
import { getStudentAttendanceSummary } from "@/lib/attendance/queries";
import { StudentFeesPanel } from "@/lib/fees/components/StudentFeesPanel";
import { formatDateDisplay } from "@/lib/core/dateIst";
import { getCurrentPhotoUrl, listDocuments } from "@/lib/core/documents/queries";
import { PhotoUploadForm } from "@/lib/core/documents/components/PhotoUploadForm";
import { DocumentsSection } from "@/lib/core/documents/components/DocumentsSection";
import { getCustomFieldDefinitions, getCustomFieldValues } from "@/lib/core/customFields/queries";
import { CustomFieldsForm } from "@/lib/core/customFields/components/CustomFieldsForm";
import { InviteGuardianButton } from "@/lib/students/components/InviteGuardianButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Avatar } from "@/components/Avatar";
import { Tabs } from "@/components/Tabs";
import { Field } from "@/components/Field";

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const permissions = await getPermissions();
  const student = await getStudent(session.schoolId!, id);

  if (!student) notFound();

  const badgeState = studentStatusBadgeState(student.status);
  const attendance = await getStudentAttendanceSummary(session.schoolId!, student.id);
  const photoUrl = await getCurrentPhotoUrl(session.schoolId!, "student", student.id);
  const documents = await listDocuments(session.schoolId!, "student", student.id);
  const customFieldDefinitions = await getCustomFieldDefinitions(session.schoolId!, "student");
  const customFieldValues = await getCustomFieldValues(session.schoolId!, "student", student.id);
  const canManage = permissions.includes("school.manage_students");
  const canManageFees = permissions.includes("school.manage_fees");
  const canInviteGuardians = permissions.includes("school.manage_admissions");

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs
        items={[{ label: "Students", href: "/people/students" }, { label: `${student.firstName} ${student.lastName}` }]}
      />

      <div className="flex items-center justify-end gap-2">
        {canManage ? (
          <a
            href={`/api/id-cards/student/${student.id}/pdf`}
            className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary"
          >
            <IdCard className="h-4 w-4" aria-hidden="true" />
            Download ID Card
          </a>
        ) : null}
        {canManage ? (
          <Link
            href={`/people/students/${student.id}/edit`}
            className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit
          </Link>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <aside className="flex shrink-0 flex-col items-center gap-2 rounded-md border border-border bg-card p-4 text-center shadow-sm md:w-64">
          <Avatar firstName={student.firstName} lastName={student.lastName} photoUrl={photoUrl} />
          <p className="text-lg font-semibold">
            {student.firstName} {student.lastName}
          </p>
          <p className="font-figures text-sm text-muted-foreground">{student.admissionNumber}</p>
          <p className="text-sm text-muted-foreground">
            {student.className ? `${student.className} - ${student.sectionName}` : "—"}
          </p>
          {badgeState ? <StatusBadge state={badgeState} label={student.status} /> : null}
          {canManage ? <PhotoUploadForm ownerType="student" ownerId={student.id} hasPhoto={Boolean(photoUrl)} /> : null}
        </aside>

        <div className="flex-1">
          <Tabs
            tabs={[
              {
                id: "profile",
                label: "Profile",
                content: (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 gap-x-6 gap-y-4 rounded-md border border-border bg-card p-4 shadow-sm sm:grid-cols-2">
                      <Field label="Roll number" value={student.rollNumber} />
                      <Field label="Date of birth" value={formatDateDisplay(student.dob)} />
                      <Field label="Gender" value={student.gender} />
                      <Field label="Blood group" value={student.bloodGroup} />
                      <Field label="Previous school" value={student.previousSchoolName} />
                    </div>
                    {customFieldDefinitions.length > 0 ? (
                      <div className="rounded-md border border-border bg-card p-4 shadow-sm">
                        <h3 className="mb-3 text-sm font-semibold">Custom Fields</h3>
                        <CustomFieldsForm
                          entityType="student"
                          entityId={student.id}
                          definitions={customFieldDefinitions}
                          values={customFieldValues}
                          canManage={canManage}
                        />
                      </div>
                    ) : null}
                  </div>
                ),
              },
              {
                id: "guardians",
                label: "Guardians",
                content: (
                  <div className="rounded-md border border-border bg-card p-4 shadow-sm">
                    {student.guardians.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No guardian records.</p>
                    ) : (
                      <ul className="flex flex-col gap-3">
                        {student.guardians.map((g) => (
                          <li key={g.guardianId} className="grid grid-cols-2 items-center gap-2 text-sm sm:grid-cols-5">
                            <span className="font-medium">{g.firstName}</span>
                            <span className="capitalize text-muted-foreground">{g.relationshipType}</span>
                            <span className="font-figures">{g.phone ?? "—"}</span>
                            <span>{g.email ?? "—"}</span>
                            {canInviteGuardians ? <InviteGuardianButton guardianId={g.guardianId} email={g.email} /> : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ),
              },
              {
                id: "attendance",
                label: "Attendance",
                content: (
                  <div className="rounded-md border border-border bg-card p-4 shadow-sm">
                    {attendance.daysMarked === 0 ? (
                      <p className="text-sm text-muted-foreground">No attendance recorded yet this year.</p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-4 text-sm">
                          <span>
                            <span className="font-figures text-lg font-semibold">{attendance.percent}%</span>{" "}
                            <span className="text-muted-foreground">academic-year-to-date</span>
                          </span>
                          <span className="font-figures text-muted-foreground">({attendance.daysMarked} days recorded)</span>
                        </div>
                        <ul className="flex flex-col divide-y divide-border">
                          {attendance.history.slice(0, 15).map((row) => (
                            <li key={row.attendanceDate} className="flex items-center justify-between py-1 text-sm">
                              <span className="font-figures text-muted-foreground">{formatDateDisplay(row.attendanceDate)}</span>
                              <span className="capitalize">{row.status.replace("_", " ")}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ),
              },
              {
                id: "fees",
                label: "Fees",
                content: <StudentFeesPanel schoolId={session.schoolId!} studentId={student.id} canManage={canManageFees} />,
              },
              {
                id: "documents",
                label: "Documents",
                content: (
                  <div className="rounded-md border border-border bg-card p-4 shadow-sm">
                    <DocumentsSection ownerType="student" ownerId={student.id} documents={documents} canManage={canManage} />
                  </div>
                ),
              },
            ]}
          />
          {/* Exams tab attaches here once that module surfaces student-facing data on this page --
              another entry in the `tabs` array above, not a restructure of this page. */}
        </div>
      </div>
    </div>
  );
}
