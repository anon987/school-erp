"use client";

import { useFormState, useFormStatus } from "react-dom";
import { reviewSubmissionAction, type HomeworkFormState } from "../actions";

const initialState: HomeworkFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary disabled:opacity-60">
      Save remarks
    </button>
  );
}

export function ReviewSubmissionForm({ submissionId, existingRemarks }: { submissionId: string; existingRemarks: string | null }) {
  const [state, formAction] = useFormState(reviewSubmissionAction.bind(null, submissionId), initialState);
  return (
    <form action={formAction} className="flex items-end gap-2">
      <textarea
        name="teacherRemarks"
        required
        defaultValue={existingRemarks ?? ""}
        rows={1}
        placeholder="Remarks"
        className="min-w-[10rem] flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs"
      />
      <SubmitButton />
      {state.error ? <span className="text-xs text-danger-solid">{state.error}</span> : null}
    </form>
  );
}
