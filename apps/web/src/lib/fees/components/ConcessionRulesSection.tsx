"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createConcessionRuleAction, deleteConcessionRuleAction, type FeesFormState } from "../actions";
import { FeesDeleteButton } from "./FeesDeleteButton";
import type { ConcessionRuleRow, FeeHeadRow } from "../types";

const initialState: FeesFormState = {};

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary disabled:opacity-60">
      Add rule
    </button>
  );
}

/** Auto-applies at invoice-generation time to every student of the matching category -- see fn_generate_yearly_invoices. Not retroactive if a student's category changes afterward (confirmed scope). */
export function ConcessionRulesSection({
  rules,
  feeHeads,
  categories,
}: {
  rules: ConcessionRuleRow[];
  feeHeads: FeeHeadRow[];
  categories: { id: string; label: string }[];
}) {
  const [state, formAction] = useFormState(createConcessionRuleAction, initialState);
  const [type, setType] = useState<"percentage" | "fixed">("percentage");

  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Concession Rules</h2>
        <p className="text-sm text-muted-foreground">e.g. "EWS category gets 20% off Tuition Fee" -- applied automatically per category, or manually per student from the collection screen via an adjustment.</p>
      </div>

      {rules.length > 0 ? (
        <ul className="divide-y divide-border text-sm">
          {rules.map((rule) => (
            <li key={rule.id} className="flex items-center justify-between py-1.5">
              <span>
                {rule.label} — {rule.categoryLabel}, {rule.feeHeadName ?? "all heads"}:{" "}
                <span className="font-figures">{rule.type === "percentage" ? `${rule.percentageValue}%` : `₹${(rule.fixedValuePaise ?? 0) / 100}`}</span>
              </span>
              <FeesDeleteButton action={deleteConcessionRuleAction.bind(null, rule.id)} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">None yet.</p>
      )}

      <form action={formAction} className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
        <select name="categoryId" required className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" defaultValue="">
          <option value="" disabled>
            Category
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <select name="feeHeadId" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" defaultValue="">
          <option value="">All fee heads</option>
          {feeHeads.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
        <select name="type" value={type} onChange={(e) => setType(e.target.value as "percentage" | "fixed")} className="rounded-md border border-input bg-background px-2 py-1.5 text-sm">
          <option value="percentage">Percentage off</option>
          <option value="fixed">Fixed amount off</option>
        </select>
        <input
          name="value"
          type="number"
          step="0.01"
          min="0"
          required
          placeholder={type === "percentage" ? "% e.g. 20" : "₹ amount"}
          className="w-32 rounded-md border border-input bg-background px-2 py-1.5 text-sm font-figures"
        />
        <input name="label" required placeholder="Label, e.g. EWS scholarship" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
        <AddButton />
      </form>
      {state.error ? <p className="text-sm text-danger-solid">{state.error}</p> : null}
    </section>
  );
}
