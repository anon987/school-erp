"use client";

import { useFormState, useFormStatus } from "react-dom";
import { submitHomeworkAction, type HomeworkFormState } from "../actions";

const initialState: HomeworkFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
      Submit
    </button>
  );
}

export function SubmitHomeworkForm({ submissionId }: { submissionId: string }) {
  const [state, formAction] = useFormState(submitHomeworkAction.bind(null, submissionId), initialState);
  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
      <textarea name="content" rows={2} placeholder="A note about your work (optional if attaching a file)" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
      <input type="file" name="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="text-xs" />
      <div>
        <SubmitButton />
        {state.error ? <p className="mt-1 text-xs text-danger-solid">{state.error}</p> : null}
      </div>
    </form>
  );
}
