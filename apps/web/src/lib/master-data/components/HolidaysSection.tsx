"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createHolidayAction, deleteHolidayAction, updateHolidayAction, type MasterDataFormState } from "../actions";
import type { HolidayRow } from "../types";
import { DeleteRowButton } from "@/components/DeleteRowButton";
import { EditableText } from "./EditableText";
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
      Add
    </button>
  );
}

/**
 * Feeds Attendance's marking-screen holiday warning and the year-to-date percentage's holiday
 * exclusion (see packages/db attendance migration's fn_attendance_percentages) -- not a general
 * academic-calendar builder. Date is fixed once created (only `name` is inline-editable, same
 * trade-off StudentCategoriesSection makes for `key`): correcting a wrong date is
 * delete-and-recreate, which is rare enough not to need a second edit affordance.
 */
export function HolidaysSection({ holidays }: { holidays: HolidayRow[] }) {
  const [state, formAction] = useFormState(createHolidayAction, initialState);

  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Holidays</h2>
        <p className="text-sm text-muted-foreground">
          Declared non-teaching days. The attendance marking screen warns before a teacher marks one, and these dates never count
          against a student&apos;s attendance percentage.
        </p>
      </div>

      {holidays.length > 0 ? (
        <ul className="divide-y divide-border">
          {holidays.map((h) => (
            <li key={h.id} className="flex items-center justify-between py-1 text-sm">
              <div className="flex items-center gap-3">
                <span className="font-figures text-muted-foreground">{formatDateDisplay(h.date)}</span>
                <EditableText id={h.id} value={h.name} fieldName="name" updateAction={updateHolidayAction} />
              </div>
              <DeleteRowButton action={deleteHolidayAction.bind(null, h.id)} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">None yet.</p>
      )}

      <form action={formAction} className="flex items-end gap-2 pt-1">
        <input
          type="date"
          name="date"
          required
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          aria-label="Holiday date"
        />
        <input
          name="name"
          required
          placeholder="e.g. Diwali"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <AddButton />
      </form>
      {state.error ? <p className="text-sm text-danger-solid">{state.error}</p> : null}
    </section>
  );
}
