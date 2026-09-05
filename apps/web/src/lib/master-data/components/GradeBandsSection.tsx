"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createGradeBandAction, deleteGradeBandAction, type MasterDataFormState } from "../actions";
import type { GradeBandRow } from "../types";
import { DeleteRowButton } from "@/components/DeleteRowButton";

const initialState: MasterDataFormState = {};

function AddButton() {
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

/**
 * The percentage-to-grade mapping Exams' marks entry and report cards both call through
 * fn_resolve_grade -- a P0 Master Data gap discovered while starting Exams, not an Exams-only
 * setting. Add-and-delete only (see actions.ts) -- a wrong band is corrected by deleting and
 * re-adding, not editing one field at a time.
 */
export function GradeBandsSection({ bands }: { bands: GradeBandRow[] }) {
  const [state, formAction] = useFormState(createGradeBandAction, initialState);
  const sorted = [...bands].sort((a, b) => b.minPercentage - a.minPercentage);

  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Grade Bands</h2>
        <p className="text-sm text-muted-foreground">
          Percentage ranges mapped to a grade -- used by Exams for marks entry and report cards. E.g. 91-100 = A1.
        </p>
      </div>

      {sorted.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-1 pr-3 font-medium">Range</th>
              <th className="py-1 pr-3 font-medium">Grade</th>
              <th className="py-1 pr-3 font-medium">Grade point</th>
              <th className="py-1 pr-3 font-medium">Remark</th>
              <th className="py-1 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((b) => (
              <tr key={b.id} className="border-b border-border last:border-0">
                <td className="font-figures py-1.5 pr-3">
                  {b.minPercentage}% - {b.maxPercentage}%
                </td>
                <td className="py-1.5 pr-3 font-medium">{b.gradeLabel}</td>
                <td className="font-figures py-1.5 pr-3 text-muted-foreground">{b.gradePoint ?? "—"}</td>
                <td className="py-1.5 pr-3 text-muted-foreground">{b.remark ?? "—"}</td>
                <td className="py-1.5 text-right">
                  <DeleteRowButton action={deleteGradeBandAction.bind(null, b.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-muted-foreground">None yet -- Exams will fall back to showing raw percentages until at least one band covers each possible score.</p>
      )}

      <form action={formAction} className="flex flex-wrap items-end gap-2 pt-1">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Min %
          <input name="minPercentage" type="number" min={0} max={100} step="0.01" required className="w-20 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Max %
          <input name="maxPercentage" type="number" min={0} max={100} step="0.01" required className="w-20 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Grade
          <input name="gradeLabel" required placeholder="e.g. A1" className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Grade point
          <input name="gradePoint" type="number" min={0} max={10} step="0.1" placeholder="Optional" className="w-28 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Remark
          <input name="remark" placeholder="Optional" className="w-32 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </label>
        <AddButton />
      </form>
      {state.error ? <p className="text-sm text-danger-solid">{state.error}</p> : null}
    </section>
  );
}
