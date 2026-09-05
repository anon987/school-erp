"use client";

import { useFormState, useFormStatus } from "react-dom";
import { recordStageEventAction, type AdmissionsFormState } from "../actions";
import type { AdmissionStageOption } from "../types";

const initialState: AdmissionsFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary disabled:opacity-60">
      Move stage
    </button>
  );
}

/** Excludes 'admitted' stages -- moving there only happens through ConfirmAdmissionForm, which also creates the student. */
export function StageMoveForm({ applicationId, stages }: { applicationId: string; stages: AdmissionStageOption[] }) {
  const [state, formAction] = useFormState(recordStageEventAction.bind(null, applicationId), initialState);
  const movableStages = stages.filter((s) => s.stageType !== "admitted");

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-card p-4 shadow-sm">
      <label className="flex flex-col gap-1 text-sm">
        Move to stage
        <select name="stageId" required defaultValue="" className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="" disabled>
            Select a stage
          </option>
          {movableStages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Test/interview score (optional)
        <input name="score" type="number" step="0.01" min="0" className="w-28 rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </label>
      <label className="flex flex-1 flex-col gap-1 text-sm">
        Notes
        <input name="notes" className="min-w-[10rem] rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </label>
      <SubmitButton />
      {state.error ? <p className="w-full text-sm text-danger-solid">{state.error}</p> : null}
    </form>
  );
}
