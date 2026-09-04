"use client";

import { useFormState, useFormStatus } from "react-dom";
import { addQualificationAction, type QualificationFormState } from "../actions";

const initialState: QualificationFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary disabled:opacity-60"
    >
      Add
    </button>
  );
}

export function AddQualificationForm({ staffId }: { staffId: string }) {
  const [state, formAction] = useFormState(addQualificationAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="staffId" value={staffId} />
      <div className="flex flex-col gap-1">
        <label htmlFor="degree" className="text-sm font-medium">
          Degree
        </label>
        <input id="degree" name="degree" required className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="institution" className="text-sm font-medium">
          Institution
        </label>
        <input id="institution" name="institution" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="yearCompleted" className="text-sm font-medium">
          Year
        </label>
        <input
          id="yearCompleted"
          name="yearCompleted"
          placeholder="YYYY"
          className="w-20 rounded-md border border-input bg-background px-3 py-2 text-sm font-figures"
        />
      </div>
      <SubmitButton />
      {state.error ? <p className="text-sm text-danger-solid">{state.error}</p> : null}
    </form>
  );
}
