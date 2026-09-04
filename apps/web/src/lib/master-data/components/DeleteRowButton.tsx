"use client";

import { Trash2 } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";
import type { MasterDataFormState } from "../actions";

const initialState: MasterDataFormState = {};

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
 * row-actions overflow menu -- a master-data row only ever has one possible action, so a menu
 * would add a click for no reason. Every master-data delete action shares the
 * (id, prevState, formData) => State shape (see lib/master-data/actions.ts's deleteRow) -- one
 * row-scoped button component, bound to whichever action the caller passes.
 */
export function DeleteRowButton({
  action,
}: {
  action: (prevState: MasterDataFormState, formData: FormData) => Promise<MasterDataFormState>;
}) {
  const [state, formAction] = useFormState(action, initialState);
  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <SubmitButton />
      {state.error ? <span className="text-xs text-danger-solid">{state.error}</span> : null}
    </form>
  );
}
