"use client";

import { useFormState, useFormStatus } from "react-dom";
import { publishHomeworkAction, type HomeworkFormState } from "../actions";

const initialState: HomeworkFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary disabled:opacity-60">
      Publish
    </button>
  );
}

export function PublishHomeworkButton({ homeworkId }: { homeworkId: string }) {
  const [state, formAction] = useFormState(publishHomeworkAction.bind(null, homeworkId), initialState);
  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <SubmitButton />
      {state.error ? <span className="text-xs text-danger-solid">{state.error}</span> : null}
    </form>
  );
}
