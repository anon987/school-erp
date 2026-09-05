"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { recordPaymentAction } from "../actions";
import type { StudentInvoiceRow } from "../types";

/**
 * cash/cheque/upi only -- "online" isn't offered here: that path creates a Razorpay order and
 * hands off to Checkout client-side, a different flow entirely (see packages/integrations/payments
 * once that lands). These three record immediately because the accountant's own entry IS the
 * authoritative record for them -- no gateway confirmation to wait for.
 */
export function RecordPaymentForm({ invoice }: { invoice: StudentInvoiceRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [receiptNote, setReceiptNote] = useState<string | null>(null);
  const dueAmount = (invoice.totalAmountPaise - invoice.paidAmountPaise) / 100;

  function handleSubmit(formData: FormData) {
    setError(null);
    setReceiptNote(null);
    // See attendance/components/MarkingClient.tsx's handleSubmit for why this is wrapped instead
    // of passing an async function directly.
    startTransition(() => {
      void (async () => {
        formData.set("invoiceId", invoice.invoiceId);
        const result = await recordPaymentAction({}, formData);
        if (result.error) setError(result.error);
        else {
          setReceiptNote("Payment recorded.");
          router.refresh();
        }
      })();
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-wrap items-end gap-2 text-sm">
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Amount (₹)
        <input
          name="amountRupees"
          type="number"
          step="0.01"
          min="0.01"
          defaultValue={dueAmount > 0 ? dueAmount.toFixed(2) : undefined}
          required
          className="w-28 rounded-md border border-input bg-background px-2 py-1.5 font-figures"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Method
        <select name="method" className="rounded-md border border-input bg-background px-2 py-1.5">
          <option value="cash">Cash</option>
          <option value="cheque">Cheque</option>
          <option value="upi">UPI</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Reference (optional)
        <input name="referenceNumber" placeholder="Cheque / UTR no." className="w-32 rounded-md border border-input bg-background px-2 py-1.5" />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Recording…" : "Record payment"}
      </button>
      {error ? <span className="text-xs text-danger-solid">{error}</span> : null}
      {receiptNote ? <span className="text-xs text-success-solid">{receiptNote}</span> : null}
    </form>
  );
}
