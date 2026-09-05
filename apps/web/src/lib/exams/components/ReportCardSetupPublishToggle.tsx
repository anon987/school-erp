"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateReportCardSetupPublishAction, type ReportCardSetupFormState } from "../reportCardSetup.actions";

const initialState: ReportCardSetupFormState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary disabled:opacity-60">
      {pending ? "…" : label}
    </button>
  );
}

export function ReportCardSetupPublishToggle({ setupId, isPublished }: { setupId: string; isPublished: boolean }) {
  const action = updateReportCardSetupPublishAction.bind(null, setupId, !isPublished);
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <SubmitButton label={isPublished ? "Unpublish" : "Publish"} />
      {state.error ? <span className="text-xs text-danger-solid">{state.error}</span> : null}
    </form>
  );
}
