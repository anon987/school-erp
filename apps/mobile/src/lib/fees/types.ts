/** Subset of apps/web/src/lib/fees/types.ts -- only what the read-only parent portal fees tab
 *  needs. Fee collection (recording a payment) is a staff-only web feature, not built on mobile. */
export type PaymentMethod = "cash" | "cheque" | "upi" | "online";
export type PaymentStatus = "recorded" | "pending_gateway" | "captured" | "failed";
export type InvoiceStatus = "pending" | "partially_paid" | "paid" | "overdue" | "cancelled";

export interface StudentInvoiceRow {
  invoiceId: string;
  invoiceNumber: string;
  installmentLabel: string;
  installmentSequence: number;
  academicYearId: string;
  academicYearName: string;
  dueDate: string;
  status: InvoiceStatus;
  totalAmountPaise: number;
  paidAmountPaise: number;
  isOverdue: boolean;
}

export interface PaymentRow {
  id: string;
  invoiceNumber: string;
  amountPaise: number;
  method: PaymentMethod;
  status: PaymentStatus;
  receiptNumber: string | null;
  referenceNumber: string | null;
  createdAt: string;
}
