import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, IdCard } from "lucide-react";
import { StatusBadge } from "@schoolerp/ui";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getPermissions } from "@/lib/core/auth/permissions";
import { getStaff, getStaffAssignments, getAssignmentFormOptions, getLeaveTypes, getStaffLeaveRequests } from "@/lib/staff/queries";
import { staffStatusBadgeState } from "@/lib/staff/statusBadge";
import { AddQualificationForm } from "@/lib/staff/components/AddQualificationForm";
import { StaffAssignmentsSection } from "@/lib/staff/components/StaffAssignmentsSection";
import { StaffLeaveSection } from "@/lib/staff/components/StaffLeaveSection";
import { formatDateDisplay } from "@/lib/core/dateIst";
import { getCurrentPhotoUrl, listDocuments } from "@/lib/core/documents/queries";
import { getCurrentAcademicYearId, getCurrentAcademicYearName } from "@/lib/core/school/getCurrentAcademicYear";
import { PhotoUploadForm } from "@/lib/core/documents/components/PhotoUploadForm";
import { DocumentsSection } from "@/lib/core/documents/components/DocumentsSection";
import { getCustomFieldDefinitions, getCustomFieldValues } from "@/lib/core/customFields/queries";
import { CustomFieldsForm } from "@/lib/core/customFields/components/CustomFieldsForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Avatar } from "@/components/Avatar";
import { Tabs } from "@/components/Tabs";
import { Field } from "@/components/Field";

export default async function StaffProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const permissions = await getPermissions();
  const staff = await getStaff(session.schoolId!, id);

  if (!staff) notFound();

  const badgeState = staffStatusBadgeState(staff.employmentStatus);
  const canManage = permissions.includes("school.manage_staff");
  const academicYearId = await getCurrentAcademicYearId(session.schoolId!);

  const [photoUrl, academicYearName, assignments, assignmentOptions, leaveTypes, leaveRequests, documents, customFieldDefinitions, customFieldValues] =
    await Promise.all([
      getCurrentPhotoUrl(session.schoolId!, "staff", staff.id),
      getCurrentAcademicYearName(session.schoolId!),
      academicYearId ? getStaffAssignments(session.schoolId!, staff.id, academicYearId) : Promise.resolve([]),
      getAssignmentFormOptions(session.schoolId!),
      getLeaveTypes(session.schoolId!),
      getStaffLeaveRequests(session.schoolId!, staff.id),
      listDocuments(session.schoolId!, "staff", staff.id),
      getCustomFieldDefinitions(session.schoolId!, "staff"),
      getCustomFieldValues(session.schoolId!, "staff", staff.id),
    ]);

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: "Staff", href: "/people/staff" }, { label: `${staff.firstName} ${staff.lastName}` }]} />

      <div className="flex items-center justify-end gap-2">
        {canManage ? (
          <a
            href={`/api/id-cards/staff/${staff.id}/pdf`}
            className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary"
          >
            <IdCard className="h-4 w-4" aria-hidden="true" />
            Download ID Card
          </a>
        ) : null}
        {canManage ? (
          <Link
            href={`/people/staff/${staff.id}/edit`}
            className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit
          </Link>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <aside className="flex shrink-0 flex-col items-center gap-2 rounded-md border border-border bg-card p-4 text-center shadow-sm md:w-64">
          <Avatar firstName={staff.firstName} lastName={staff.lastName} photoUrl={photoUrl} />
          <p className="text-lg font-semibold">
            {staff.firstName} {staff.lastName}
          </p>
          <p className="font-figures text-sm text-muted-foreground">{staff.employeeCode}</p>
          <p className="text-sm text-muted-foreground">{staff.designationName ?? staff.departmentName ?? "—"}</p>
          {badgeState ? <StatusBadge state={badgeState} label={staff.employmentStatus} /> : null}
          {canManage ? <PhotoUploadForm ownerType="staff" ownerId={staff.id} hasPhoto={Boolean(photoUrl)} /> : null}
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
                      <Field label="Department" value={staff.departmentName} />
                      <Field label="Designation" value={staff.designationName} />
                      <Field label="Joining date" value={formatDateDisplay(staff.joiningDate)} />
                      <Field label="Phone" value={staff.phone} />
                      <Field label="Email" value={staff.email} />
                    </div>
                    {customFieldDefinitions.length > 0 ? (
                      <div className="rounded-md border border-border bg-card p-4 shadow-sm">
                        <h3 className="mb-3 text-sm font-semibold">Custom Fields</h3>
                        <CustomFieldsForm
                          entityType="staff"
                          entityId={staff.id}
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
                id: "roles",
                label: "Roles",
                content: (
                  <div className="rounded-md border border-border bg-card p-4 shadow-sm">
                    {staff.hasLogin ? (
                      staff.roles.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {staff.roles.map((role) => (
                            <span key={role} className="rounded bg-secondary px-2 py-1 text-xs capitalize">
                              {role.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Has a login but no roles assigned yet.</p>
                      )
                    ) : (
                      <p className="text-sm text-muted-foreground">No system login for this staff member.</p>
                    )}
                  </div>
                ),
              },
              {
                id: "qualifications",
                label: "Qualifications",
                content: (
                  <div className="rounded-md border border-border bg-card p-4 shadow-sm">
                    {staff.qualifications.length > 0 ? (
                      <ul className="mb-4 flex flex-col gap-2">
                        {staff.qualifications.map((q) => (
                          <li key={q.id} className="grid grid-cols-3 gap-2 text-sm">
                            <span className="font-medium">{q.degree}</span>
                            <span className="text-muted-foreground">{q.institution ?? "—"}</span>
                            <span className="font-figures">{q.yearCompleted ?? "—"}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mb-4 text-sm text-muted-foreground">No qualifications recorded.</p>
                    )}
                    {canManage ? <AddQualificationForm staffId={staff.id} /> : null}
                  </div>
                ),
              },
              {
                id: "assignments",
                label: "Assignments",
                content: (
                  <div className="rounded-md border border-border bg-card p-4 shadow-sm">
                    <StaffAssignmentsSection
                      staffId={staff.id}
                      academicYearId={academicYearId}
                      academicYearName={academicYearName}
                      assignments={assignments}
                      options={assignmentOptions}
                      canManage={canManage}
                    />
                  </div>
                ),
              },
              {
                id: "leave",
                label: "Leave",
                content: (
                  <div className="rounded-md border border-border bg-card p-4 shadow-sm">
                    <StaffLeaveSection staffId={staff.id} leaveTypes={leaveTypes} leaveRequests={leaveRequests} canManage={canManage} />
                  </div>
                ),
              },
              {
                id: "documents",
                label: "Documents",
                content: (
                  <div className="rounded-md border border-border bg-card p-4 shadow-sm">
                    <DocumentsSection ownerType="staff" ownerId={staff.id} documents={documents} canManage={canManage} />
                  </div>
                ),
              },
            ]}
          />
          {/* Payroll tab attaches here once that module ships (P3) -- see the equivalent note on
              the student profile page. */}
        </div>
      </div>
    </div>
  );
}
