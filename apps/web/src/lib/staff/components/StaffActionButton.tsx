"use client";

import { useFormState, useFormStatus } from "react-dom";

function SubmitButton({ label, danger }: { label: string; danger?: boolean | undefined }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`text-xs underline-offset-2 hover:underline disabled:opacity-60 ${danger ? "text-danger-solid" : "text-primary"}`}>
      {pending ? "…" : label}
    </button>
  );
}

/** Small client wrapper for the (prevState, formData) => Promise<{error?}> server-action
 *  convention used throughout this module -- same pattern as ExamsDeleteButton/
 *  AdmitCardHoldToggle, kept local to lib/staff rather than a cross-feature import. */
export function StaffActionButton({ action, label, danger }: { action: (prevState: { error?: string }, formData: FormData) => Promise<{ error?: string }>; label: string; danger?: boolean }) {
  const [state, formAction] = useFormState(action, {});
  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <SubmitButton label={label} danger={danger} />
      {state.error ? <span className="text-xs text-danger-solid">{state.error}</span> : null}
    </form>
  );
}
