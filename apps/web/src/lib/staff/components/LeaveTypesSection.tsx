"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createLeaveTypeAction, deleteLeaveTypeAction, type LeaveTypeFormState } from "../actions";
import { StaffActionButton } from "./StaffActionButton";
import type { LeaveType } from "../types";

const initialState: LeaveTypeFormState = {};

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary disabled:opacity-60">
      Add
    </button>
  );
}

/** Configuration for the Leave records feature -- a short, rarely-changed list (Casual/Sick/
 *  Earned leave and similar), so a compact section here rather than a full Master Data screen. */
export function LeaveTypesSection({ leaveTypes }: { leaveTypes: LeaveType[] }) {
  const [state, formAction] = useFormState(createLeaveTypeAction, initialState);

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-4 shadow-sm">
      <h3 className="text-lg font-semibold">Leave Types</h3>
      {leaveTypes.length > 0 ? (
        <ul className="divide-y divide-border">
          {leaveTypes.map((lt) => (
            <li key={lt.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {lt.name} <span className="text-xs text-muted-foreground">({lt.isPaid ? "Paid" : "Unpaid"})</span>
              </span>
              <StaffActionButton action={deleteLeaveTypeAction.bind(null, lt.id)} label="Delete" danger />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No leave types yet -- add one below (e.g. Casual Leave, Sick Leave).</p>
      )}
      <form action={formAction} className="flex flex-wrap items-end gap-2 pt-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Name
          <input name="name" required placeholder="e.g. Casual Leave" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" name="isPaid" defaultChecked />
          Paid
        </label>
        <AddButton />
        {state.error ? <p className="text-sm text-danger-solid">{state.error}</p> : null}
      </form>
    </div>
  );
}
