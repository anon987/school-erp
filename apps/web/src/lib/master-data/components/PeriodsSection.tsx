"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createPeriodAction, deletePeriodAction, type MasterDataFormState } from "../actions";
import type { PeriodRow } from "../types";
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

/** Feeds the Timetable builder's day/period grid and the print/portal views -- add-and-delete only, same trade-off as Holidays/Grade bands. */
export function PeriodsSection({ periods }: { periods: PeriodRow[] }) {
  const [state, formAction] = useFormState(createPeriodAction, initialState);

  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Periods</h2>
        <p className="text-sm text-muted-foreground">The school day&apos;s bell schedule. Used by the Timetable builder and printable/portal views.</p>
      </div>

      {periods.length > 0 ? (
        <ul className="divide-y divide-border">
          {periods.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-1 text-sm">
              <div className="flex items-center gap-3">
                <span className="font-figures text-muted-foreground">
                  #{p.periodNumber} {p.startTime}-{p.endTime}
                </span>
                <span>{p.label}</span>
                {p.isBreak ? <span className="text-xs text-muted-foreground">(break)</span> : null}
              </div>
              <DeleteRowButton action={deletePeriodAction.bind(null, p.id)} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">None yet.</p>
      )}

      <form action={formAction} className="flex flex-wrap items-end gap-2 pt-1">
        <input name="periodNumber" type="number" min="1" required placeholder="#" className="w-16 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <input name="label" required placeholder="e.g. Period 1" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <input name="startTime" type="time" required className="rounded-md border border-input bg-background px-3 py-2 text-sm" aria-label="Start time" />
        <input name="endTime" type="time" required className="rounded-md border border-input bg-background px-3 py-2 text-sm" aria-label="End time" />
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" name="isBreak" /> Break
        </label>
        <AddButton />
      </form>
      {state.error ? <p className="text-sm text-danger-solid">{state.error}</p> : null}
    </section>
  );
}
