"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateReportCardSetupIncludeHpcAction, type ReportCardSetupFormState } from "../reportCardSetup.actions";

const initialState: ReportCardSetupFormState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary disabled:opacity-60">
      {pending ? "…" : label}
    </button>
  );
}

export function ReportCardSetupHpcToggle({ setupId, includeHpc }: { setupId: string; includeHpc: boolean }) {
  const action = updateReportCardSetupIncludeHpcAction.bind(null, setupId, !includeHpc);
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <SubmitButton label={includeHpc ? "HPC: On" : "HPC: Off"} />
      {state.error ? <span className="text-xs text-danger-solid">{state.error}</span> : null}
    </form>
  );
}
