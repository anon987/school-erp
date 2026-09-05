"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Pencil } from "lucide-react";
import {
  createAcademicYearAction,
  deleteAcademicYearAction,
  setCurrentAcademicYearAction,
  updateAcademicYearAction,
  type MasterDataFormState,
} from "../actions";
import type { AcademicYearRow } from "../types";
import { DeleteRowButton } from "@/components/DeleteRowButton";
import { formatDateDisplay } from "@/lib/core/dateIst";

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

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:opacity-90">
      Save
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

// Three fields edited together (name, start, end) -- its own inline form, same reasoning as
// Subjects: EditableText is for the single-field case.
function AcademicYearRowItem({ year }: { year: AcademicYearRow }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useFormState(updateAcademicYearAction.bind(null, year.id), initialState);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (submittedRef.current && !state.error) setEditing(false);
  }, [state]);

  if (editing) {
    return (
      <li className="flex flex-col gap-2 py-1.5">
        <form
          action={(fd) => {
            submittedRef.current = true;
            formAction(fd);
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <input name="name" defaultValue={year.name} autoFocus className="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm" />
          <input name="startDate" type="date" defaultValue={year.startDate} className="rounded-md border border-input bg-background px-2 py-1 text-sm" />
          <input name="endDate" type="date" defaultValue={year.endDate} className="rounded-md border border-input bg-background px-2 py-1 text-sm" />
          <SaveButton />
          <button type="button" onClick={() => setEditing(false)} className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-secondary">
            Cancel
          </button>
          {state.error ? <span className="text-xs text-danger-solid">{state.error}</span> : null}
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between py-1.5 text-sm">
      <button type="button" onClick={() => setEditing(true)} className="group flex items-center gap-1.5 rounded px-1 py-0.5 hover:bg-secondary">
        <span className="font-figures">
          {year.name} ({formatDateDisplay(year.startDate)} – {formatDateDisplay(year.endDate)}){" "}
          {year.isCurrent ? <strong className="text-success-solid">current</strong> : null}
        </span>
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" aria-hidden="true" />
      </button>
      <span className="flex items-center gap-2">
        {!year.isCurrent ? <SetCurrentButton id={year.id} /> : null}
        <DeleteRowButton action={deleteAcademicYearAction.bind(null, year.id)} />
      </span>
    </li>
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
    <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">1. Academic Year</h2>
        <p className="text-sm text-muted-foreground">Which year you&apos;re setting up for. Required.</p>
      </div>

      {years.length > 0 ? (
        <ul className="divide-y divide-border">
          {years.map((year) => (
            <AcademicYearRowItem key={year.id} year={year} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No academic year yet -- add the current one below.</p>
      )}

      <form action={formAction} className="flex flex-wrap items-end gap-2 pt-1">
        <div className="flex flex-col gap-1">
          <label htmlFor="ay-name" className="text-xs font-medium text-muted-foreground">
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
          <label htmlFor="ay-start" className="text-xs font-medium text-muted-foreground">
            Start date
          </label>
          <input id="ay-start" name="startDate" type="date" required className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="ay-end" className="text-xs font-medium text-muted-foreground">
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
