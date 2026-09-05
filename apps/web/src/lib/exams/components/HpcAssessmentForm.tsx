"use client";

import { useFormState, useFormStatus } from "react-dom";
import { saveHpcAssessmentsAction, type HpcFormState } from "../hpc.actions";
import type { HpcData, HpcRatingRow } from "../types";

const initialState: HpcFormState = {};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="self-start rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save Ratings"}
    </button>
  );
}

function CriterionRow({ row, ratingScales }: { row: HpcRatingRow; ratingScales: { id: string; code: string; label: string }[] }) {
  return (
    <div className="grid grid-cols-[1fr_auto_2fr] items-center gap-3 rounded-md border border-border px-3 py-2">
      <input type="hidden" name="criterionId" value={row.criterionId} />
      <span className="text-sm">{row.criterionName}</span>
      <select
        name={`rating_${row.criterionId}`}
        defaultValue={row.ratingScaleId ?? ""}
        className="w-40 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
      >
        <option value="">Not rated</option>
        {ratingScales.map((r) => (
          <option key={r.id} value={r.id}>
            {r.code} — {r.label}
          </option>
        ))}
      </select>
      <input
        name={`remarks_${row.criterionId}`}
        defaultValue={row.remarks ?? ""}
        placeholder="Remarks (optional)"
        className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
      />
    </div>
  );
}

/** Ratings entry for one student's Holistic Progress Card section within a report card setup --
 *  every configured criterion always renders (see getHpcDataForStudent), so a teacher sees the
 *  full checklist even before anything has been rated. Full-replace save (hpc.actions.ts). */
export function HpcAssessmentForm({
  setupId,
  classId,
  studentId,
  hpc,
  ratingScales,
}: {
  setupId: string;
  classId: string;
  studentId: string;
  hpc: HpcData;
  ratingScales: { id: string; code: string; label: string }[];
}) {
  const action = saveHpcAssessmentsAction.bind(null, setupId, studentId, classId);
  const [state, formAction] = useFormState(action, initialState);

  if (ratingScales.length === 0) {
    return <p className="text-sm text-muted-foreground">Add at least one rating scale value in Master Data before entering ratings.</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {hpc.coCurricular.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Co-curricular</h3>
          {hpc.coCurricular.map((row) => (
            <CriterionRow key={row.criterionId} row={row} ratingScales={ratingScales} />
          ))}
        </div>
      ) : null}

      {hpc.lifeSkills.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Life Skills</h3>
          {hpc.lifeSkills.map((row) => (
            <CriterionRow key={row.criterionId} row={row} ratingScales={ratingScales} />
          ))}
        </div>
      ) : null}

      {hpc.coCurricular.length === 0 && hpc.lifeSkills.length === 0 ? (
        <p className="text-sm text-muted-foreground">Add co-curricular/life-skill criteria in Master Data first.</p>
      ) : (
        <SaveButton />
      )}
      {state.error ? <p className="text-sm text-danger-solid">{state.error}</p> : null}
    </form>
  );
}
