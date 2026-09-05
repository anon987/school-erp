"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createLeaveRequestAction, cancelLeaveRequestAction, type LeaveRequestFormState } from "../actions";
import { StaffActionButton } from "./StaffActionButton";
import { formatDateDisplay } from "@/lib/core/dateIst";
import type { LeaveRequest, LeaveType } from "../types";

const initialState: LeaveRequestFormState = {};

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary disabled:opacity-60">
      {pending ? "Logging…" : "Log leave"}
    </button>
  );
}

const STATUS_LABEL: Record<LeaveRequest["status"], string> = { pending: "Pending", approved: "Approved", rejected: "Rejected", cancelled: "Cancelled" };

export function StaffLeaveSection({
  staffId,
  leaveTypes,
  leaveRequests,
  canManage,
}: {
  staffId: string;
  leaveTypes: LeaveType[];
  leaveRequests: LeaveRequest[];
  canManage: boolean;
}) {
  const [state, formAction] = useFormState(createLeaveRequestAction, initialState);

  return (
    <div className="flex flex-col gap-4">
      {leaveRequests.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-1 pr-3 font-medium">Type</th>
              <th className="py-1 pr-3 font-medium">Dates</th>
              <th className="py-1 pr-3 text-right font-medium">Days</th>
              <th className="py-1 pr-3 font-medium">Reason</th>
              <th className="py-1 pr-3 font-medium">Status</th>
              <th className="py-1 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {leaveRequests.map((lr) => (
              <tr key={lr.id} className="border-b border-border last:border-0">
                <td className="py-1.5 pr-3">{lr.leaveTypeName}</td>
                <td className="font-figures py-1.5 pr-3">
                  {formatDateDisplay(lr.startDate)} – {formatDateDisplay(lr.endDate)}
                </td>
                <td className="font-figures py-1.5 pr-3 text-right">{lr.dayCount}</td>
                <td className="py-1.5 pr-3 text-muted-foreground">{lr.reason ?? "—"}</td>
                <td className="py-1.5 pr-3 text-xs">{STATUS_LABEL[lr.status]}</td>
                <td className="py-1.5 text-right">
                  {canManage && lr.status === "approved" ? <StaffActionButton action={cancelLeaveRequestAction.bind(null, staffId, lr.id)} label="Cancel" danger /> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-muted-foreground">No leave recorded yet.</p>
      )}

      {!canManage ? null : leaveTypes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Add a leave type in the Staff directory first before logging leave.</p>
      ) : (
        <form action={formAction} className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
          <input type="hidden" name="staffId" value={staffId} />
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Type
            <select name="leaveTypeId" required className="w-36 rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Select…</option>
              {leaveTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Start date
            <input type="date" name="startDate" required className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            End date
            <input type="date" name="endDate" required className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Reason
            <span className="font-normal normal-case"> (optional)</span>
            <input name="reason" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </label>
          <AddButton />
          {state.error ? <p className="text-sm text-danger-solid">{state.error}</p> : null}
        </form>
      )}
    </div>
  );
}
