import { deleteStaffAssignmentAction } from "../actions";
import { AddStaffAssignmentForm } from "./AddStaffAssignmentForm";
import { StaffActionButton } from "./StaffActionButton";
import type { AssignmentFormOptions, StaffAssignment } from "../types";

export function StaffAssignmentsSection({
  staffId,
  academicYearId,
  academicYearName,
  assignments,
  options,
  canManage,
}: {
  staffId: string;
  academicYearId: string | null;
  academicYearName: string | null;
  assignments: StaffAssignment[];
  options: AssignmentFormOptions;
  canManage: boolean;
}) {
  if (!academicYearId) {
    return <p className="text-sm text-muted-foreground">No current academic year set -- configure one in Master Data first.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">Academic year: {academicYearName ?? "—"}</p>
      {assignments.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-1 pr-3 font-medium">Class</th>
              <th className="py-1 pr-3 font-medium">Section</th>
              <th className="py-1 pr-3 font-medium">Subject</th>
              <th className="py-1 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) => (
              <tr key={a.id} className="border-b border-border last:border-0">
                <td className="py-1.5 pr-3">{a.className}</td>
                <td className="py-1.5 pr-3">{a.sectionName}</td>
                <td className="py-1.5 pr-3">{a.subjectName}</td>
                <td className="py-1.5 text-right">
                  {canManage ? <StaffActionButton action={deleteStaffAssignmentAction.bind(null, staffId, a.id)} label="Remove" danger /> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-muted-foreground">No class/subject assignments yet for this academic year.</p>
      )}
      {canManage ? <AddStaffAssignmentForm staffId={staffId} academicYearId={academicYearId} options={options} /> : null}
    </div>
  );
}
