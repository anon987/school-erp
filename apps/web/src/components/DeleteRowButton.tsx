"use client";

import { Trash2 } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";

export interface DeleteRowFormState {
  error?: string;
}

const initialState: DeleteRowFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Delete"
      className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:text-danger-solid hover:bg-danger disabled:opacity-60"
    >
      <Trash2 className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

/**
 * docs/design-system.md > Forms > Inline-editable tables: one inline delete icon, not the
 * row-actions overflow menu -- a row that only ever has one possible action doesn't need a menu.
 * Cross-feature (master-data, timetable, ...) -- every delete action across this app shares the
 * same (id, prevState, formData) => {error?: string} shape, so one row-scoped button component,
 * bound to whichever action the caller passes, covers all of them.
 */
export function DeleteRowButton({
  action,
}: {
  action: (prevState: DeleteRowFormState, formData: FormData) => Promise<DeleteRowFormState>;
}) {
  const [state, formAction] = useFormState(action, initialState);
  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <SubmitButton />
      {state.error ? <span className="text-xs text-danger-solid">{state.error}</span> : null}
    </form>
  );
}
