"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createFeeHeadAction, deleteFeeHeadAction, type FeesFormState } from "../actions";
import { FeesDeleteButton } from "./FeesDeleteButton";
import type { FeeHeadRow } from "../types";

const initialState: FeesFormState = {};

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary disabled:opacity-60">
      Add
    </button>
  );
}

/** "Tuition Fee" (recurring, charged every installment) vs "Admission Fee" (one-time) -- the is_recurring flag drives which installment(s) fn_generate_yearly_invoices attaches an item using this head to. */
export function FeeHeadsSection({ feeHeads }: { feeHeads: FeeHeadRow[] }) {
  const [state, formAction] = useFormState(createFeeHeadAction, initialState);

  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
      <h2 className="text-lg font-semibold">Fee Heads</h2>
      {feeHeads.length > 0 ? (
        <ul className="divide-y divide-border">
          {feeHeads.map((head) => {
            return (
              <li key={head.id} className="flex items-center justify-between py-1.5 text-sm">
                <span>
                  {head.name} <span className="text-xs text-muted-foreground">{head.isRecurring ? "(monthly)" : "(one-time)"}</span>
                </span>
                <FeesDeleteButton action={deleteFeeHeadAction.bind(null, head.id)} />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">None yet.</p>
      )}
      <form action={formAction} className="flex flex-wrap items-end gap-2 pt-1">
        <input name="name" required placeholder="e.g. Tuition Fee" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" name="isRecurring" defaultChecked />
          Monthly (recurring)
        </label>
        <AddButton />
      </form>
      {state.error ? <p className="text-sm text-danger-solid">{state.error}</p> : null}
    </section>
  );
}
