import { supabase } from "../core/supabase/client";
import type { PaymentRow, StudentInvoiceRow } from "./types";

/** Port of apps/web/src/lib/fees/queries.ts's getStudentInvoices/getInvoicePayments -- the two
 *  read queries the parent portal's fees tab needs. See that file's header for why fetching a
 *  student's full invoice history unfiltered by year is safe here (bounded per student). */
export async function getStudentInvoices(schoolId: string, studentId: string): Promise<StudentInvoiceRow[]> {
  const { data, error } = await supabase
    .from("invoice")
    .select(
      "id, invoice_number, status, due_date, total_amount_paise, " +
        "installment:installment_id(label, sequence_number), academic_year:academic_year_id(id, name), payment(amount_paise, status)",
    )
    .eq("school_id", schoolId)
    .eq("student_id", studentId)
    .order("due_date");
  if (error) throw error;

  const today = new Date().toISOString().slice(0, 10);

  return (
    (data ?? []) as unknown as {
      id: string;
      invoice_number: string;
      status: StudentInvoiceRow["status"];
      due_date: string;
      total_amount_paise: number;
      installment: { label: string; sequence_number: number } | null;
      academic_year: { id: string; name: string } | null;
      payment: { amount_paise: number; status: string }[];
    }[]
  ).map((row) => {
    const paid = row.payment.filter((p) => p.status === "recorded" || p.status === "captured").reduce((sum, p) => sum + p.amount_paise, 0);
    return {
      invoiceId: row.id,
      invoiceNumber: row.invoice_number,
      installmentLabel: row.installment?.label ?? "",
      installmentSequence: row.installment?.sequence_number ?? 0,
      academicYearId: row.academic_year?.id ?? "",
      academicYearName: row.academic_year?.name ?? "",
      dueDate: row.due_date,
      status: row.status,
      totalAmountPaise: row.total_amount_paise,
      paidAmountPaise: paid,
      isOverdue: row.status === "pending" && row.due_date < today,
    };
  });
}

export async function getInvoicePayments(invoiceId: string): Promise<PaymentRow[]> {
  const { data, error } = await supabase
    .from("payment")
    .select("id, amount_paise, method, status, receipt_number, reference_number, created_at, invoice:invoice_id(invoice_number)")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (
    (data ?? []) as unknown as {
      id: string;
      amount_paise: number;
      method: PaymentRow["method"];
      status: PaymentRow["status"];
      receipt_number: string | null;
      reference_number: string | null;
      created_at: string;
      invoice: { invoice_number: string } | null;
    }[]
  ).map((p) => ({
    id: p.id,
    invoiceNumber: p.invoice?.invoice_number ?? "",
    amountPaise: p.amount_paise,
    method: p.method,
    status: p.status,
    receiptNumber: p.receipt_number,
    referenceNumber: p.reference_number,
    createdAt: p.created_at,
  }));
}
