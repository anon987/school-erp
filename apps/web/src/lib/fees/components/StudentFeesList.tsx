"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StatusBadge, type StatusState } from "@schoolerp/ui";
import { RecordPaymentForm } from "@/lib/fees/components/RecordPaymentForm";
import { PayOnlineButton } from "@/lib/fees/components/PayOnlineButton";
import { FineAndAdjustmentForms } from "@/lib/fees/components/FineAndAdjustmentForms";
import { formatDateDisplay } from "@/lib/core/dateIst";
import type { InvoiceStatus, PaymentRow, StudentInvoiceRow } from "@/lib/fees/types";

function statusBadgeState(status: InvoiceStatus, isOverdue: boolean): StatusState | null {
  if (status === "cancelled") return null;
  if (isOverdue) return "overdue";
  if (status === "paid") return "paid";
  if (status === "partially_paid") return "due";
  return "pending";
}

/**
 * Client half of StudentFeesPanel: everything is already fetched (see that file) -- this only
 * derives the year/month filter options from the data already in hand and narrows what's shown,
 * with no server round trip per selection.
 */
export function StudentFeesList({
  invoices,
  paymentsByInvoiceId,
  canManage,
  schoolName,
  currentAcademicYearId,
}: {
  invoices: StudentInvoiceRow[];
  paymentsByInvoiceId: Record<string, PaymentRow[]>;
  canManage: boolean;
  schoolName: string;
  currentAcademicYearId: string | null;
}) {
  const years = useMemo(() => {
    const byYear = new Map<string, { id: string; name: string; earliestDueDate: string }>();
    for (const inv of invoices) {
      if (!inv.academicYearId) continue;
      const existing = byYear.get(inv.academicYearId);
      if (!existing || inv.dueDate < existing.earliestDueDate) {
        byYear.set(inv.academicYearId, { id: inv.academicYearId, name: inv.academicYearName, earliestDueDate: inv.dueDate });
      }
    }
    return Array.from(byYear.values()).sort((a, b) => b.earliestDueDate.localeCompare(a.earliestDueDate));
  }, [invoices]);

  const [selectedYear, setSelectedYear] = useState<string>(() => {
    if (currentAcademicYearId && years.some((y) => y.id === currentAcademicYearId)) return currentAcademicYearId;
    return years[0]?.id ?? "";
  });
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  const monthsInYear = useMemo(() => {
    const seen = new Map<number, string>();
    for (const inv of invoices) {
      if (inv.academicYearId !== selectedYear) continue;
      seen.set(inv.installmentSequence, inv.installmentLabel);
    }
    return Array.from(seen.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([sequence, label]) => ({ sequence, label }));
  }, [invoices, selectedYear]);

  const filtered = invoices.filter((inv) => {
    if (selectedYear && inv.academicYearId !== selectedYear) return false;
    if (selectedMonth && String(inv.installmentSequence) !== selectedMonth) return false;
    return true;
  });

  if (invoices.length === 0) {
    return <p className="text-sm text-muted-foreground">No invoices generated yet for this student -- run invoice generation in Fees Setup.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Academic year
          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value);
              setSelectedMonth("");
            }}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Month
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">All months</option>
            {monthsInYear.map((m) => (
              <option key={m.sequence} value={m.sequence}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No invoices for this selection.</p>
      ) : (
        filtered.map((invoice) => {
          const badgeState = statusBadgeState(invoice.status, invoice.isOverdue);
          const dueAmount = invoice.totalAmountPaise - invoice.paidAmountPaise;
          const payments = paymentsByInvoiceId[invoice.invoiceId] ?? [];
          return (
            <div key={invoice.invoiceId} className="flex flex-col gap-2 rounded-md border border-border bg-card p-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-medium">{invoice.installmentLabel}</span>{" "}
                  <span className="font-figures text-xs text-muted-foreground">{invoice.invoiceNumber}</span>
                  <span className="ml-2 text-xs text-muted-foreground">Due {formatDateDisplay(invoice.dueDate)}</span>
                </div>
                {badgeState ? <StatusBadge state={badgeState} label={invoice.isOverdue ? "Overdue" : invoice.status.replace("_", " ")} /> : null}
              </div>
              <div className="font-figures text-sm">
                Total ₹{(invoice.totalAmountPaise / 100).toLocaleString("en-IN")} · Paid ₹{(invoice.paidAmountPaise / 100).toLocaleString("en-IN")} · Due ₹
                {(dueAmount / 100).toLocaleString("en-IN")}
              </div>
              {canManage && dueAmount > 0 && invoice.status !== "cancelled" ? (
                <div className="flex flex-wrap items-start gap-3">
                  <RecordPaymentForm invoice={invoice} />
                  <PayOnlineButton invoiceId={invoice.invoiceId} dueAmountPaise={dueAmount} schoolName={schoolName} />
                </div>
              ) : null}
              {payments.length > 0 ? (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer">Payment history ({payments.length})</summary>
                  <ul className="mt-1 flex flex-col gap-1">
                    {payments.map((p) => (
                      <li key={p.id} className="flex items-center justify-between">
                        <span>
                          {formatDateDisplay(p.createdAt.slice(0, 10))} · {p.method} · {p.status}
                        </span>
                        <span className="font-figures">
                          ₹{(p.amountPaise / 100).toLocaleString("en-IN")}
                          {p.receiptNumber ? (
                            <>
                              {" "}
                              ·{" "}
                              <Link href={`/finance/fees/receipts/${p.id}`} className="text-primary underline-offset-2 hover:underline">
                                {p.receiptNumber}
                              </Link>
                            </>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
              {canManage && invoice.status !== "cancelled" ? <FineAndAdjustmentForms invoiceId={invoice.invoiceId} /> : null}
            </div>
          );
        })
      )}
    </div>
  );
}
