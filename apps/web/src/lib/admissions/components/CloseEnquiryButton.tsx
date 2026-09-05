"use client";

import { useFormState, useFormStatus } from "react-dom";
import { closeEnquiryAction, type AdmissionsFormState } from "../actions";

const initialState: AdmissionsFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary disabled:opacity-60">
      Close (not proceeding)
    </button>
  );
}

export function CloseEnquiryButton({ enquiryId }: { enquiryId: string }) {
  const [state, formAction] = useFormState(closeEnquiryAction.bind(null, enquiryId), initialState);
  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <SubmitButton />
      {state.error ? <span className="text-xs text-danger-solid">{state.error}</span> : null}
    </form>
  );
}
