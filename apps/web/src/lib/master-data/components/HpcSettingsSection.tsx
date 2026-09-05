"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  createHpcCriterionAction,
  createHpcRatingScaleAction,
  deleteHpcCriterionAction,
  deleteHpcRatingScaleAction,
  type MasterDataFormState,
} from "../actions";
import type { HpcCriterionRow, HpcRatingScaleRow } from "../types";
import { DeleteRowButton } from "@/components/DeleteRowButton";

const initialState: MasterDataFormState = {};

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary disabled:opacity-60">
      Add
    </button>
  );
}

/**
 * Holistic Progress Card (P2, §H) setup: the co-curricular/life-skill areas a report card setup
 * can rate a student on, and the qualitative scale (A/Excellent .. D/Needs Improvement) used to
 * rate them. Add-and-delete only, same trade-off as Grade bands/Periods. Whether a given report
 * card setup actually includes this section is a separate per-setup toggle on the Report Cards
 * page, not here -- this section only defines what's available to choose from.
 */
export function HpcSettingsSection({ criteria, ratingScales }: { criteria: HpcCriterionRow[]; ratingScales: HpcRatingScaleRow[] }) {
  const [criterionState, criterionFormAction] = useFormState(createHpcCriterionAction, initialState);
  const [scaleState, scaleFormAction] = useFormState(createHpcRatingScaleAction, initialState);

  const coCurricular = criteria.filter((c) => c.category === "co_curricular");
  const lifeSkills = criteria.filter((c) => c.category === "life_skill");

  return (
    <section className="flex flex-col gap-6 rounded-md border border-border bg-card p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Holistic Progress Card</h2>
        <p className="text-sm text-muted-foreground">
          Co-curricular and life-skill areas a report card setup can rate a student on, alongside the academic marks.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Co-curricular &amp; life-skill areas</h3>
        {criteria.length > 0 ? (
          <div className="flex flex-col gap-3">
            {coCurricular.length > 0 ? (
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Co-curricular</p>
                <ul className="flex flex-wrap gap-2">
                  {coCurricular.map((c) => (
                    <li key={c.id} className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-sm">
                      {c.name}
                      <DeleteRowButton action={deleteHpcCriterionAction.bind(null, c.id)} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {lifeSkills.length > 0 ? (
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Life skills</p>
                <ul className="flex flex-wrap gap-2">
                  {lifeSkills.map((c) => (
                    <li key={c.id} className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-sm">
                      {c.name}
                      <DeleteRowButton action={deleteHpcCriterionAction.bind(null, c.id)} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">None yet.</p>
        )}

        <form action={criterionFormAction} className="flex items-end gap-2 pt-1">
          <select name="category" className="rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue="co_curricular">
            <option value="co_curricular">Co-curricular</option>
            <option value="life_skill">Life skill</option>
          </select>
          <input name="name" required placeholder="e.g. Music, Teamwork" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <AddButton />
        </form>
        {criterionState.error ? <p className="text-sm text-danger-solid">{criterionState.error}</p> : null}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Rating scale</h3>
        {ratingScales.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {ratingScales.map((r) => (
              <li key={r.id} className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-sm">
                <span className="font-figures font-medium">{r.code}</span>
                <span className="text-muted-foreground">{r.label}</span>
                <DeleteRowButton action={deleteHpcRatingScaleAction.bind(null, r.id)} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">None yet.</p>
        )}

        <form action={scaleFormAction} className="flex items-end gap-2 pt-1">
          <input name="code" required placeholder="e.g. A" className="w-16 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input name="label" required placeholder="e.g. Excellent" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <AddButton />
        </form>
        {scaleState.error ? <p className="text-sm text-danger-solid">{scaleState.error}</p> : null}
      </div>
    </section>
  );
}
