"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  addFeeStructureItemAction,
  createFeeStructureAction,
  deleteFeeStructureAction,
  deleteFeeStructureItemAction,
  type FeesFormState,
} from "../actions";
import { FeesDeleteButton } from "./FeesDeleteButton";
import type { FeeHeadRow, FeeStructureRow } from "../types";

const initialState: FeesFormState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary disabled:opacity-60">
      {pending ? "Saving…" : label}
    </button>
  );
}

function StructureCard({ structure, feeHeads }: { structure: FeeStructureRow; feeHeads: FeeHeadRow[] }) {
  const addItemAction = addFeeStructureItemAction.bind(null, structure.id);
  const [state, formAction] = useFormState(addItemAction, initialState);
  const availableHeads = feeHeads.filter((h) => !structure.items.some((item) => item.feeHeadId === h.id));

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium">{structure.className}</span>
          <span className="text-muted-foreground"> — {structure.categoryLabel ?? "all categories"}</span>
          {structure.name ? <span className="text-xs text-muted-foreground"> ({structure.name})</span> : null}
        </div>
        <FeesDeleteButton action={deleteFeeStructureAction.bind(null, structure.id)} />
      </div>

      {structure.items.length > 0 ? (
        <ul className="divide-y divide-border text-sm">
          {structure.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between py-1">
              <span>
                {item.feeHeadName}{" "}
                <span className="font-figures text-muted-foreground">
                  ₹{(item.amountPaise / 100).toLocaleString("en-IN")}
                  {item.isRecurring ? "/month" : ` (installment ${item.oneTimeInstallmentNumber})`}
                </span>
              </span>
              <FeesDeleteButton action={deleteFeeStructureItemAction.bind(null, item.id)} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No fee heads on this structure yet.</p>
      )}

      {availableHeads.length > 0 ? (
        <form action={formAction} className="flex flex-wrap items-end gap-2 pt-1">
          <select name="feeHeadId" required className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" defaultValue="">
            <option value="" disabled>
              Fee head
            </option>
            {availableHeads.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} {h.isRecurring ? "(monthly)" : "(one-time)"}
              </option>
            ))}
          </select>
          <input
            name="amountPaise"
            type="number"
            step="0.01"
            min="0"
            required
            placeholder="Amount (₹)"
            className="w-32 rounded-md border border-input bg-background px-2 py-1.5 text-sm font-figures"
          />
          <input
            name="oneTimeInstallmentNumber"
            type="number"
            min="1"
            max="12"
            placeholder="Installment # (one-time only)"
            className="w-44 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          />
          <SubmitButton label="Add" />
        </form>
      ) : null}
      {state.error ? <p className="text-xs text-danger-solid">{state.error}</p> : null}
    </div>
  );
}

export function FeeStructuresSection({
  structures,
  feeHeads,
  classes,
  categories,
}: {
  structures: FeeStructureRow[];
  feeHeads: FeeHeadRow[];
  classes: { id: string; name: string }[];
  categories: { id: string; label: string }[];
}) {
  const [state, formAction] = useFormState(createFeeStructureAction, initialState);

  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Fee Structures</h2>
        <p className="text-sm text-muted-foreground">
          One per class (leave category blank to apply to every category in that class, or pick one for a category-specific override).
        </p>
      </div>

      {structures.length === 0 ? (
        <p className="text-sm text-muted-foreground">None yet -- add fee heads first, then a structure per class.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {structures.map((s) => (
            <StructureCard key={s.id} structure={s} feeHeads={feeHeads} />
          ))}
        </div>
      )}

      <form action={formAction} className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
        <select name="classId" required className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" defaultValue="">
          <option value="" disabled>
            Class
          </option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="categoryId" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" defaultValue="">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <input name="name" required placeholder="e.g. Class 6 Standard" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
        <SubmitButton label="Add structure" />
      </form>
      {state.error ? <p className="text-sm text-danger-solid">{state.error}</p> : null}
    </section>
  );
}
