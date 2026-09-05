"use client";

import { Trash2 } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";
import type { ExamsFormState } from "../actions";

const initialState: ExamsFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Delete"
      className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-danger hover:text-danger-solid disabled:opacity-60"
    >
      <Trash2 className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

export function ExamsDeleteButton({ action }: { action: (prevState: ExamsFormState, formData: FormData) => Promise<ExamsFormState> }) {
  const [state, formAction] = useFormState(action, initialState);
  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <SubmitButton />
      {state.error ? <span className="text-xs text-danger-solid">{state.error}</span> : null}
    </form>
  );
}
