export interface FeeHeadRow {
  id: string;
  name: string;
  isRecurring: boolean;
}

export interface InstallmentRow {
  id: string;
  sequenceNumber: number;
  dueDate: string;
  label: string;
}

export interface FeeStructureItemRow {
  id: string;
  feeHeadId: string;
  feeHeadName: string;
  isRecurring: boolean;
  amountPaise: number;
  oneTimeInstallmentNumber: number | null;
}

export interface FeeStructureRow {
  id: string;
  className: string;
  categoryLabel: string | null;
  name: string;
  items: FeeStructureItemRow[];
}

export interface ConcessionRuleRow {
  id: string;
  categoryLabel: string;
  feeHeadName: string | null;
  type: "percentage" | "fixed";
  percentageValue: number | null;
  fixedValuePaise: number | null;
  label: string;
}

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

export interface DefaulterRow {
  studentId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  className: string;
  sectionName: string;
  dueAmountPaise: number;
  overdueInvoiceCount: number;
}

export interface DailyCollectionSummaryRow {
  method: PaymentMethod;
  count: number;
  totalPaise: number;
}

/** Fee collection report for a date range -- P1 baseline "fee collection (daily/monthly)" report.
 *  byMethod/byDate cover both granularities from one range query; class-wise breakdown is not
 *  included in this pass (a payment isn't directly joined to a class -- it would need a second
 *  student->enrollment lookup per payment -- flagged as a scope cut, not silently dropped). */
export interface CollectionReport {
  byMethod: { method: PaymentMethod; count: number; totalPaise: number }[];
  byDate: { date: string; count: number; totalPaise: number }[];
  grandTotalPaise: number;
  grandTotalCount: number;
}

/** P1 baseline "concessions" report -- every invoice_line with a concession applied, for one
 *  academic year. One row per (student, fee head) with a concession, not per invoice_line raw
 *  row, since a student can have the same fee head concession applied across several installments
 *  and the report should show their total for the year. */
export interface ConcessionReportRow {
  studentId: string;
  admissionNumber: string;
  studentName: string;
  className: string;
  sectionName: string;
  feeHeadName: string;
  totalConcessionPaise: number;
}
