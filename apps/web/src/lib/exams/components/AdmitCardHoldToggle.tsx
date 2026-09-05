"use client";

import { useFormState, useFormStatus } from "react-dom";
import { toggleAdmitCardHoldAction, type AdmitCardFormState } from "../admitCard.actions";

const initialState: AdmitCardFormState = {};

function SubmitButton({ label, danger }: { label: string; danger?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`text-xs underline-offset-2 hover:underline disabled:opacity-60 ${danger ? "text-danger-solid" : "text-primary"}`}>
      {pending ? "…" : label}
    </button>
  );
}

/** Small client wrapper around toggleAdmitCardHoldAction -- server actions using the
 *  (prevState, formData) useFormState convention need a client boundary to bind their hook, same
 *  pattern as ExamsDeleteButton.tsx. */
export function AdmitCardHoldToggle({ examId, studentId, isHeld }: { examId: string; studentId: string; isHeld: boolean }) {
  const action = toggleAdmitCardHoldAction.bind(null, examId, studentId, !isHeld);
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} className="flex items-center gap-1">
      {!isHeld ? <input type="text" name="reason" placeholder="Reason (optional)" className="w-28 rounded-md border border-input bg-background px-2 py-1 text-xs" /> : null}
      <SubmitButton label={isHeld ? "Release hold" : "Hold"} danger={!isHeld} />
      {state.error ? <span className="text-xs text-danger-solid">{state.error}</span> : null}
    </form>
  );
}
