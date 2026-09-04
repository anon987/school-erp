"use client";

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
      className="rounded-md px-2 py-1 text-xs text-danger-solid hover:bg-danger disabled:opacity-60"
    >
      Delete
    </button>
  );
}

/**
 * Every master-data delete action shares the (id, prevState, formData) => State shape (see
 * lib/master-data/actions.ts's deleteRow) -- one row-scoped button component, bound to whichever
 * action the caller passes, instead of one near-identical component per entity.
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
