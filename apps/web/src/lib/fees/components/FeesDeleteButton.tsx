"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { FeesFormState } from "../actions";

const initialState: FeesFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="text-xs text-muted-foreground hover:text-danger-solid disabled:cursor-not-allowed disabled:opacity-60">
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}

/**
 * Every fees delete action shares the (prevState, formData) => FeesFormState shape -- one
 * row-scoped button, bound to whichever already-`.bind(null, id)`'d action the caller passes.
 * `<form action={rawAction}>` directly (skipping useFormState) does NOT work here the way it
 * does for a true `(formData) => void` action -- these still take a leading prevState argument,
 * which is exactly what useFormState's returned dispatcher supplies.
 */
export function FeesDeleteButton({ action }: { action: (prevState: FeesFormState, formData: FormData) => Promise<FeesFormState> }) {
  const [state, formAction] = useFormState(action, initialState);
  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <SubmitButton />
      {state.error ? <span className="text-xs text-danger-solid">{state.error}</span> : null}
    </form>
  );
}
