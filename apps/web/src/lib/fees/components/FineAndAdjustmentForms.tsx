"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addAdjustmentAction, addFineAction } from "../actions";

/**
 * Deliberately tucked behind a <details> disclosure, not surfaced next to Record Payment --
 * these are the exception-handling actions (a late fee, a refund/correction), not the everyday
 * one. Both write an immutable row referencing the invoice (fine) or the invoice/payment
 * (payment_adjustment) -- never edit anything, per CLAUDE.md's financial integrity rule.
 */
export function FineAndAdjustmentForms({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fineError, setFineError] = useState<string | null>(null);
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null);

  // See attendance/components/MarkingClient.tsx's handleSubmit for why these are wrapped instead
  // of passing an async function directly.
  function handleAddFine(formData: FormData) {
    setFineError(null);
    formData.set("invoiceId", invoiceId);
    startTransition(() => {
      void (async () => {
        const result = await addFineAction({}, formData);
        if (result.error) setFineError(result.error);
        else router.refresh();
      })();
    });
  }

  function handleAddAdjustment(formData: FormData) {
    setAdjustmentError(null);
    formData.set("invoiceId", invoiceId);
    startTransition(() => {
      void (async () => {
        const result = await addAdjustmentAction({}, formData);
        if (result.error) setAdjustmentError(result.error);
        else router.refresh();
      })();
    });
  }

  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-muted-foreground">Add fine or adjustment</summary>
      <div className="mt-2 flex flex-col gap-3">
        <form action={handleAddFine} className="flex flex-wrap items-end gap-2">
          <span className="text-xs font-medium text-muted-foreground">Fine:</span>
          <input name="amountRupees" type="number" step="0.01" min="0.01" required placeholder="₹" className="w-20 rounded-md border border-input bg-background px-2 py-1 font-figures" />
          <input name="reason" required placeholder="Reason" className="w-40 rounded-md border border-input bg-background px-2 py-1" />
          <button type="submit" disabled={isPending} className="rounded-md border border-border px-2 py-1 hover:bg-secondary disabled:opacity-60">
            Add fine
          </button>
          {fineError ? <span className="text-danger-solid">{fineError}</span> : null}
        </form>

        <form action={handleAddAdjustment} className="flex flex-wrap items-end gap-2">
          <span className="text-xs font-medium text-muted-foreground">Adjustment:</span>
          <select name="type" className="rounded-md border border-input bg-background px-2 py-1">
            <option value="refund">Refund</option>
            <option value="correction">Correction</option>
            <option value="concession_adjustment">Concession adjustment</option>
            <option value="fine_waiver">Fine waiver</option>
          </select>
          <input name="amountRupees" type="number" step="0.01" min="0.01" required placeholder="₹" className="w-20 rounded-md border border-input bg-background px-2 py-1 font-figures" />
          <input name="reason" required placeholder="Reason" className="w-40 rounded-md border border-input bg-background px-2 py-1" />
          <button type="submit" disabled={isPending} className="rounded-md border border-border px-2 py-1 hover:bg-secondary disabled:opacity-60">
            Add adjustment
          </button>
          {adjustmentError ? <span className="text-danger-solid">{adjustmentError}</span> : null}
        </form>
      </div>
    </details>
  );
}
