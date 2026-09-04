"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createAcademicYearAction, deleteAcademicYearAction, setCurrentAcademicYearAction, type MasterDataFormState } from "../actions";
import type { AcademicYearRow } from "../types";
import { DeleteRowButton } from "./DeleteRowButton";

const initialState: MasterDataFormState = {};

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary disabled:opacity-60"
    >
      Add year
    </button>
  );
}

function SetCurrentButton({ id }: { id: string }) {
  const [state, formAction] = useFormState(setCurrentAcademicYearAction.bind(null, id), initialState);
  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <button type="submit" className="rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary">
        Set current
      </button>
      {state.error ? <span className="text-xs text-danger-solid">{state.error}</span> : null}
    </form>
  );
}

/**
 * Frames the rest of the setup ("which year am I configuring") even though nothing else here is
 * technically FK-scoped to it -- class/section aren't per-year rows (see
 * packages/db/supabase/migrations/20260903213402_master_data.sql), so this is first for clarity,
 * not because the database requires it.
 */
export function AcademicYearSection({ years }: { years: AcademicYearRow[] }) {
  const [state, formAction] = useFormState(createAcademicYearAction, initialState);

  return (
    <section className="flex flex-col gap-3 rounded-md border border-border p-4">
      <div>
        <h2 className="text-lg font-semibold">1. Academic Year</h2>
        <p className="text-sm text-muted-foreground">Which year you&apos;re setting up for. Required.</p>
      </div>

      {years.length > 0 ? (
        <ul className="divide-y divide-border">
          {years.map((year) => (
            <li key={year.id} className="flex items-center justify-between py-1.5 text-sm">
              <span className="font-figures">
                {year.name} ({year.startDate} – {year.endDate}) {year.isCurrent ? <strong className="text-success-solid">current</strong> : null}
              </span>
              <span className="flex items-center gap-2">
                {!year.isCurrent ? <SetCurrentButton id={year.id} /> : null}
                <DeleteRowButton action={deleteAcademicYearAction.bind(null, year.id)} />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No academic year yet -- add the current one below.</p>
      )}

      <form action={formAction} className="flex flex-wrap items-end gap-2 pt-1">
        <div className="flex flex-col gap-1">
          <label htmlFor="ay-name" className="text-sm font-medium">
            Name
          </label>
          <input
            id="ay-name"
            name="name"
            required
            placeholder="2026-27"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="ay-start" className="text-sm font-medium">
            Start date
          </label>
          <input id="ay-start" name="startDate" type="date" required className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="ay-end" className="text-sm font-medium">
            End date
          </label>
          <input id="ay-end" name="endDate" type="date" required className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <AddButton />
      </form>
      {state.error ? <p className="text-sm text-danger-solid">{state.error}</p> : null}
    </section>
  );
}
