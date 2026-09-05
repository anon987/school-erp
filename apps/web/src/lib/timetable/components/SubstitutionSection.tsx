"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createSubstitutionAction, deleteSubstitutionAction, type TimetableFormState } from "../actions";
import { DAY_NAMES, type StaffOption, type SubstitutionRow, type TimetableSlotRow } from "../types";
import type { PeriodRow } from "@/lib/master-data/types";
import { DeleteRowButton } from "@/components/DeleteRowButton";

const initialState: TimetableFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary disabled:opacity-60">
      Assign substitute
    </button>
  );
}

function SlotSubstitutionForm({ slot, periods, staffOptions }: { slot: TimetableSlotRow; periods: PeriodRow[]; staffOptions: StaffOption[] }) {
  const [state, formAction] = useFormState(createSubstitutionAction, initialState);
  const period = periods.find((p) => p.id === slot.periodId);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 rounded-md border border-border px-3 py-2 text-sm">
      <input type="hidden" name="timetableSlotId" value={slot.id} />
      <span className="text-xs text-muted-foreground">
        {DAY_NAMES[slot.dayOfWeek]} · {period?.label} · {slot.subjectName} ({slot.staffName})
      </span>
      <label className="flex flex-col gap-1 text-xs">
        Date
        <input name="substitutionDate" type="date" required className="rounded-md border border-input bg-background px-2 py-1 text-xs" />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        Substitute
        <select name="substituteStaffId" required defaultValue="" className="rounded-md border border-input bg-background px-2 py-1 text-xs">
          <option value="" disabled>
            Select
          </option>
          {staffOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <input name="reason" placeholder="Reason (optional)" className="rounded-md border border-input bg-background px-2 py-1 text-xs" />
      <SubmitButton />
      {state.error ? <span className="text-xs text-danger-solid">{state.error}</span> : null}
    </form>
  );
}

export function SubstitutionSection({
  slots,
  periods,
  staffOptions,
  existingSubstitutions,
}: {
  slots: TimetableSlotRow[];
  periods: PeriodRow[];
  staffOptions: StaffOption[];
  existingSubstitutions: SubstitutionRow[];
}) {
  const substitutionBySlotId = new Map(existingSubstitutions.map((s) => [s.timetableSlotId, s]));

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">Substitutions</h2>
      <p className="text-sm text-muted-foreground">Cover one period, for one date, when the assigned teacher is absent.</p>
      <div className="flex flex-col gap-2">
        {slots.map((slot) => {
          const existing = substitutionBySlotId.get(slot.id);
          return existing ? (
            <div key={slot.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
              <span>
                {DAY_NAMES[slot.dayOfWeek]} · {slot.subjectName}: {existing.originalStaffName} → <strong>{existing.substituteStaffName}</strong> on{" "}
                {existing.substitutionDate}
              </span>
              <DeleteRowButton action={deleteSubstitutionAction.bind(null, existing.id)} />
            </div>
          ) : (
            <SlotSubstitutionForm key={slot.id} slot={slot} periods={periods} staffOptions={staffOptions} />
          );
        })}
        {slots.length === 0 ? <p className="text-sm text-muted-foreground">No timetable slots yet for this section.</p> : null}
      </div>
    </section>
  );
}
