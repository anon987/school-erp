"use client";

import { useFormState, useFormStatus } from "react-dom";
import { submitLeaveApplicationAction, type PortalFormState } from "../actions";

const initialState: PortalFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
      Submit request
    </button>
  );
}

export function LeaveApplicationForm({ studentId }: { studentId: string }) {
  const [state, formAction] = useFormState(submitLeaveApplicationAction.bind(null, studentId), initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-card p-4 shadow-sm">
      <label className="flex flex-col gap-1 text-sm">
        From
        <input name="fromDate" type="date" required className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        To
        <input name="toDate" type="date" required className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </label>
      <label className="flex flex-1 flex-col gap-1 text-sm">
        Reason
        <input name="reason" required className="min-w-[10rem] rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </label>
      <SubmitButton />
      {state.error ? <p className="w-full text-sm text-danger-solid">{state.error}</p> : null}
    </form>
  );
}
