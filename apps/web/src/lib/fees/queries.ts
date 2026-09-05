import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import { getCurrentAcademicYearId } from "@/lib/core/school/getCurrentAcademicYear";
import type {
  ConcessionReportRow,
  ConcessionRuleRow,
  CollectionReport,
  DailyCollectionSummaryRow,
  DefaulterRow,
  FeeHeadRow,
  FeeStructureRow,
  InstallmentRow,
  PaymentMethod,
  PaymentRow,
  StudentInvoiceRow,
} from "./types";

export async function getClassOptions(schoolId: string): Promise<{ id: string; name: string }[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("class").select("id, name").eq("school_id", schoolId).order("sort_order");
  if (error) throw error;
  return (data ?? []) as unknown as { id: string; name: string }[];
}

export async function getSectionOptions(schoolId: string): Promise<{ id: string; classId: string; name: string }[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("section").select("id, class_id, name, class:class_id!inner(school_id)").eq("class.school_id", schoolId).order("name");
  if (error) throw error;
  return ((data ?? []) as unknown as { id: string; class_id: string; name: string }[]).map((s) => ({ id: s.id, classId: s.class_id, name: s.name }));
}

export async function getCategoryOptions(schoolId: string): Promise<{ id: string; label: string }[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("student_category").select("id, label").eq("school_id", schoolId).order("label");
  if (error) throw error;
  return (data ?? []) as unknown as { id: string; label: string }[];
}

export async function getFeeHeads(schoolId: string): Promise<FeeHeadRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("fee_head").select("id, name, is_recurring").eq("school_id", schoolId).order("name");
  if (error) throw error;
  return ((data ?? []) as unknown as { id: string; name: string; is_recurring: boolean }[]).map((h) => ({
    id: h.id,
    name: h.name,
    isRecurring: h.is_recurring,
  }));
}

export async function getInstallments(schoolId: string, academicYearId: string): Promise<InstallmentRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("installment")
    .select("id, sequence_number, due_date, label")
    .eq("school_id", schoolId)
    .eq("academic_year_id", academicYearId)
    .order("sequence_number");
  if (error) throw error;
  return ((data ?? []) as unknown as { id: string; sequence_number: number; due_date: string; label: string }[]).map((i) => ({
    id: i.id,
    sequenceNumber: i.sequence_number,
    dueDate: i.due_date,
    label: i.label,
  }));
}

export async function getFeeStructures(schoolId: string, academicYearId: string): Promise<FeeStructureRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("fee_structure")
    .select(
      "id, name, class:class_id(name, sort_order), category:category_id(label), " +
        "fee_structure_item(id, amount_paise, one_time_installment_number, fee_head:fee_head_id(id, name, is_recurring))",
    )
    .eq("school_id", schoolId)
    .eq("academic_year_id", academicYearId);
  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    id: string;
    name: string;
    class: { name: string; sort_order: number } | null;
    category: { label: string } | null;
    fee_structure_item: {
      id: string;
      amount_paise: number;
      one_time_installment_number: number | null;
      fee_head: { id: string; name: string; is_recurring: boolean } | null;
    }[];
  }[];

  return rows
    .map(
      (r) =>
        ({
          id: r.id,
          className: r.class?.name ?? "",
          categoryLabel: r.category?.label ?? null,
          name: r.name,
          sortOrder: r.class?.sort_order ?? 0,
          items: r.fee_structure_item
            .filter((item) => item.fee_head)
            .map((item) => ({
              id: item.id,
              feeHeadId: item.fee_head!.id,
              feeHeadName: item.fee_head!.name,
              isRecurring: item.fee_head!.is_recurring,
              amountPaise: item.amount_paise,
              oneTimeInstallmentNumber: item.one_time_installment_number,
            })),
        }) satisfies FeeStructureRow & { sortOrder: number },
    )
    .sort((a, b) => a.sortOrder - b.sortOrder || (a.categoryLabel ?? "").localeCompare(b.categoryLabel ?? ""));
}

export async function getConcessionRules(schoolId: string, academicYearId: string): Promise<ConcessionRuleRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("concession_rule")
    .select("id, type, percentage_value, fixed_value_paise, label, category:category_id(label), fee_head:fee_head_id(name)")
    .eq("school_id", schoolId)
    .eq("academic_year_id", academicYearId);
  if (error) throw error;

  return ((data ?? []) as unknown as {
    id: string;
    type: "percentage" | "fixed";
    percentage_value: number | null;
    fixed_value_paise: number | null;
    label: string;
    category: { label: string } | null;
    fee_head: { name: string } | null;
  }[]).map((r) => ({
    id: r.id,
    categoryLabel: r.category?.label ?? "",
    feeHeadName: r.fee_head?.name ?? null,
    type: r.type,
    percentageValue: r.percentage_value,
    fixedValuePaise: r.fixed_value_paise,
    label: r.label,
  }));
}

/**
 * How many students still have no invoice at all for the current year -- drives the "generate
 * invoices" call-to-action and its progress readout. Computed in one SQL query
 * (fn_count_uninvoiced_students, a NOT EXISTS join), not by fetching every enrolled student's id
 * into JS and building a `.in()` filter from it -- for a 2,200-student school that filter was a
 * ~2,200-UUID query string, which Supabase's gateway rejected outright with a flat 400 ("Bad
 * Request", no further detail). Same lesson as the dashboard/attendance-percentage fixes:
 * aggregate in SQL, never over the full student list in application memory.
 */
export async function getUninvoicedStudentCount(schoolId: string, academicYearId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("fn_count_uninvoiced_students", {
    p_school_id: schoolId,
    p_academic_year_id: academicYearId,
  });
  if (error) throw error;
  return (data as unknown as number) ?? 0;
}

export interface StudentSearchResult {
  studentId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  className: string;
  sectionName: string;
}

export interface CollectionBrowseFilters {
  query?: string | undefined;
  classId?: string | undefined;
  sectionId?: string | undefined;
}

const BROWSE_LIMIT = 100;

/**
 * Either a typed search (name/admission number) or a class/section browse with no text query at
 * all -- an accountant collecting fees for a whole class doesn't necessarily know who they're
 * looking for by name. At least one of query/classId/sectionId must be set; with none, nothing
 * is fetched (same "don't show the whole school unfiltered" rule as before, just extended to the
 * browse case). Capped at BROWSE_LIMIT -- a school-wide browse with no class picked would
 * otherwise return the entire enrollment; narrowing by class/section is expected for anything
 * larger than that.
 */
export async function browseStudentsForCollection(
  schoolId: string,
  academicYearId: string,
  filters: CollectionBrowseFilters,
): Promise<StudentSearchResult[]> {
  const trimmed = filters.query?.trim() ?? "";
  if (!trimmed && !filters.classId && !filters.sectionId) return [];

  const supabase = await createSupabaseServerClient();

  // `student_id!inner(...)` is required, not optional, here: without `!inner`, PostgREST's
  // embedded-resource filters only shape which fields come back on the nested `student` object
  // (nulling it out on a non-match) -- they do NOT constrain which top-level `enrollment` rows
  // are returned. Without it, this would silently return arbitrary enrollment rows with
  // `student: null` on non-matches, not a filtered result -- the exact "looks like it works,
  // returns nothing meaningful" class of bug worth calling out explicitly.
  const SELECT = "class:class_id(name), section:section_id(name), student:student_id!inner(id, admission_number, first_name, last_name)";

  function baseQuery() {
    let q = supabase.from("enrollment").select(SELECT).eq("school_id", schoolId).eq("academic_year_id", academicYearId);
    if (filters.classId) q = q.eq("class_id", filters.classId);
    if (filters.sectionId) q = q.eq("section_id", filters.sectionId);
    return q;
  }

  type Row = {
    class: { name: string } | null;
    section: { name: string } | null;
    student: { id: string; admission_number: string; first_name: string; last_name: string } | null;
  };

  let rows: Row[];
  if (!trimmed) {
    // Pure browse: no text to search, just the class/section filter, ordered for a readable list.
    const { data, error } = await baseQuery()
      .order("first_name", { referencedTable: "student" })
      .limit(BROWSE_LIMIT);
    if (error) throw error;
    rows = (data ?? []) as unknown as Row[];
  } else {
    const byAdmission = await baseQuery().ilike("student.admission_number", `%${trimmed}%`).limit(BROWSE_LIMIT);
    if (byAdmission.error) throw byAdmission.error;

    let nameRows: unknown[] = [];
    if ((byAdmission.data ?? []).length < BROWSE_LIMIT) {
      const byName = await baseQuery()
        .or(`first_name.ilike.%${trimmed}%,last_name.ilike.%${trimmed}%`, { referencedTable: "student" })
        .limit(BROWSE_LIMIT);
      if (byName.error) throw byName.error;
      nameRows = byName.data ?? [];
    }
    rows = [...(byAdmission.data ?? []), ...nameRows] as unknown as Row[];
  }

  const seen = new Set<string>();
  const results: StudentSearchResult[] = [];
  for (const row of rows) {
    if (!row.student || seen.has(row.student.id)) continue;
    seen.add(row.student.id);
    results.push({
      studentId: row.student.id,
      admissionNumber: row.student.admission_number,
      firstName: row.student.first_name,
      lastName: row.student.last_name,
      className: row.class?.name ?? "",
      sectionName: row.section?.name ?? "",
    });
  }
  return results.slice(0, BROWSE_LIMIT);
}

/**
 * No year filter -- returns the student's full invoice history across every academic year they
 * have invoices in. Safe to fetch all at once (bounded per student: a handful of years times up
 * to 12 installments, nothing like the whole-school scale that forced SQL-side aggregation
 * elsewhere in this module) -- callers that want to narrow by year/month filter this client-side
 * (see StudentFeesPanel), not by re-querying per selection.
 */
export async function getStudentInvoices(schoolId: string, studentId: string): Promise<StudentInvoiceRow[]> {
  const supabase = await createSupabaseServerClient();
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

  return ((data ?? []) as unknown as {
    id: string;
    invoice_number: string;
    status: StudentInvoiceRow["status"];
    due_date: string;
    total_amount_paise: number;
    installment: { label: string; sequence_number: number } | null;
    academic_year: { id: string; name: string } | null;
    payment: { amount_paise: number; status: string }[];
  }[]).map((row) => {
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
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("payment")
    .select("id, amount_paise, method, status, receipt_number, reference_number, created_at, invoice:invoice_id(invoice_number)")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as {
    id: string;
    amount_paise: number;
    method: PaymentRow["method"];
    status: PaymentRow["status"];
    receipt_number: string | null;
    reference_number: string | null;
    created_at: string;
    invoice: { invoice_number: string } | null;
  }[]).map((p) => ({
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

/**
 * Every unpaid/overdue invoice, aggregated to one row per student -- computed entirely in SQL by
 * fn_get_fee_defaulters (one query: aggregate due amounts per student, join straight to
 * enrollment/student/class/section), not by collecting overdue student ids in JS and then
 * `.in()`-filtering enrollment with them. That two-step shape is the same bug that crashed Fees
 * Setup's uninvoiced count on the pilot school's 2,200 students (see
 * fn_count_uninvoiced_students above it in the same migration) -- it hadn't fired here yet only
 * because it takes a large fraction of the school going overdue at once to build a big enough id
 * list, not because the shape was safe.
 */
export async function getDefaulters(schoolId: string, academicYearId: string): Promise<DefaulterRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("fn_get_fee_defaulters", {
    p_school_id: schoolId,
    p_academic_year_id: academicYearId,
  });
  if (error) throw error;

  return ((data ?? []) as unknown as {
    student_id: string;
    admission_number: string;
    first_name: string;
    last_name: string;
    class_name: string | null;
    section_name: string | null;
    due_amount_paise: number;
    overdue_invoice_count: number;
  }[]).map(
    (r) =>
      ({
        studentId: r.student_id,
        admissionNumber: r.admission_number,
        firstName: r.first_name,
        lastName: r.last_name,
        className: r.class_name ?? "",
        sectionName: r.section_name ?? "",
        dueAmountPaise: r.due_amount_paise,
        overdueInvoiceCount: r.overdue_invoice_count,
      }) satisfies DefaulterRow,
  );
}

export interface ReceiptLineItem {
  feeHeadName: string;
  amountPaise: number;
  concessionAmountPaise: number;
}

export interface ReceiptDetails {
  paymentId: string;
  studentId: string;
  receiptNumber: string | null;
  amountPaise: number;
  method: string;
  status: string;
  referenceNumber: string | null;
  createdAt: string;
  invoiceNumber: string;
  installmentLabel: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  /** The invoice's fee-head breakdown (its structure -- amount + concession per head), not a
   *  per-head allocation of this specific payment. A payment is recorded against the whole
   *  invoice, not split by fee head, so "paid"/"due" per row isn't something the data model
   *  tracks -- see invoiceTotalPaise/invoicePaidToDatePaise/invoiceBalancePaise for the
   *  invoice-level totals instead. */
  lineItems: ReceiptLineItem[];
  invoiceTotalPaise: number;
  /** Sum of every recorded/captured payment against this invoice, not just this one receipt's
   *  payment -- an invoice can be paid across multiple partial payments over time. */
  invoicePaidToDatePaise: number;
  invoiceBalancePaise: number;
  /** The student record itself has no email/phone -- only student_guardian does, per guardian.
   *  fatherName is specifically the 'father' relationship row, if one exists; the primary
   *  contact fields are whichever guardian is flagged is_primary_contact (may or may not be the
   *  father). Both null when no guardian records exist at all. */
  fatherName: string | null;
  primaryContactName: string | null;
  primaryContactRelationship: string | null;
  primaryContactPhone: string | null;
  primaryContactEmail: string | null;
}

export async function getReceiptDetails(schoolId: string, paymentId: string): Promise<ReceiptDetails | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("payment")
    .select(
      "id, student_id, receipt_number, amount_paise, method, status, reference_number, created_at, " +
        "invoice:invoice_id(invoice_number, academic_year_id, total_amount_paise, installment:installment_id(label), " +
        "invoice_line(amount_paise, concession_amount_paise, fee_head:fee_head_id(name)), payment(amount_paise, status)), " +
        "student:student_id(admission_number, first_name, last_name)",
    )
    .eq("id", paymentId)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as {
    id: string;
    student_id: string;
    receipt_number: string | null;
    amount_paise: number;
    method: string;
    status: string;
    reference_number: string | null;
    created_at: string;
    invoice: {
      invoice_number: string;
      academic_year_id: string;
      total_amount_paise: number;
      installment: { label: string } | null;
      invoice_line: { amount_paise: number; concession_amount_paise: number; fee_head: { name: string } | null }[];
      payment: { amount_paise: number; status: string }[];
    } | null;
    student: { admission_number: string; first_name: string; last_name: string } | null;
  };
  if (!row.student || !row.invoice) return null;

  // The student's enrollment for the SAME academic year this invoice belongs to -- not
  // necessarily their current one, if this receipt is being looked up for a past year (fee
  // invoices aren't section-scoped the way attendance is, so this join is the only way back to
  // "which class/section were they in" for the receipt's letterhead).
  const { data: enrollment } = await supabase
    .from("enrollment")
    .select("class:class_id(name), section:section_id(name)")
    .eq("school_id", schoolId)
    .eq("student_id", row.student_id)
    .eq("academic_year_id", row.invoice.academic_year_id)
    .maybeSingle();
  const enrollmentRow = enrollment as unknown as { class: { name: string } | null; section: { name: string } | null } | null;

  const { data: guardianRows } = await supabase
    .from("student_guardian")
    .select("relationship_type, phone, email, is_primary_contact, guardian:guardian_id(first_name, last_name)")
    .eq("school_id", schoolId)
    .eq("student_id", row.student_id);
  const guardians = (guardianRows ?? []) as unknown as {
    relationship_type: string;
    phone: string | null;
    email: string | null;
    is_primary_contact: boolean;
    guardian: { first_name: string; last_name: string | null } | null;
  }[];

  function guardianFullName(g: (typeof guardians)[number]): string {
    if (!g.guardian) return "";
    return g.guardian.last_name ? `${g.guardian.first_name} ${g.guardian.last_name}` : g.guardian.first_name;
  }

  const father = guardians.find((g) => g.relationship_type === "father") ?? null;
  const primaryContact = guardians.find((g) => g.is_primary_contact) ?? guardians[0] ?? null;

  const paidToDate = row.invoice.payment
    .filter((p) => p.status === "recorded" || p.status === "captured")
    .reduce((sum, p) => sum + p.amount_paise, 0);

  return {
    paymentId: row.id,
    studentId: row.student_id,
    receiptNumber: row.receipt_number,
    amountPaise: row.amount_paise,
    method: row.method,
    status: row.status,
    referenceNumber: row.reference_number,
    createdAt: row.created_at,
    invoiceNumber: row.invoice.invoice_number,
    installmentLabel: row.invoice.installment?.label ?? "",
    studentName: `${row.student.first_name} ${row.student.last_name}`,
    admissionNumber: row.student.admission_number,
    className: enrollmentRow?.class?.name ?? "",
    sectionName: enrollmentRow?.section?.name ?? "",
    lineItems: row.invoice.invoice_line
      .filter((item) => item.fee_head)
      .map((item) => ({
        feeHeadName: item.fee_head!.name,
        amountPaise: item.amount_paise,
        concessionAmountPaise: item.concession_amount_paise,
      })),
    invoiceTotalPaise: row.invoice.total_amount_paise,
    invoicePaidToDatePaise: paidToDate,
    invoiceBalancePaise: row.invoice.total_amount_paise - paidToDate,
    fatherName: father ? guardianFullName(father) : null,
    primaryContactName: primaryContact ? guardianFullName(primaryContact) : null,
    primaryContactRelationship: primaryContact?.relationship_type ?? null,
    primaryContactPhone: primaryContact?.phone ?? null,
    primaryContactEmail: primaryContact?.email ?? null,
  };
}

export async function getDailyCollectionSummary(schoolId: string, dateIso: string): Promise<DailyCollectionSummaryRow[]> {
  const supabase = await createSupabaseServerClient();
  const nextDay = new Date(`${dateIso}T00:00:00Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  const { data, error } = await supabase
    .from("payment")
    .select("method, amount_paise")
    .eq("school_id", schoolId)
    .in("status", ["recorded", "captured"])
    .gte("created_at", `${dateIso}T00:00:00Z`)
    .lt("created_at", nextDay.toISOString());
  if (error) throw error;

  const byMethod = new Map<string, { count: number; total: number }>();
  for (const row of (data ?? []) as unknown as { method: string; amount_paise: number }[]) {
    const current = byMethod.get(row.method) ?? { count: 0, total: 0 };
    byMethod.set(row.method, { count: current.count + 1, total: current.total + row.amount_paise });
  }

  return Array.from(byMethod.entries()).map(([method, v]) => ({
    method: method as DailyCollectionSummaryRow["method"],
    count: v.count,
    totalPaise: v.total,
  }));
}

/** P1 baseline "fee collection (daily/monthly)" report for one date range -- method-wise and
 *  day-wise totals in a single query, not fetching every payment row into JS to sum separately
 *  for each breakdown. */
export async function getCollectionReport(schoolId: string, startDate: string, endDate: string): Promise<CollectionReport> {
  const supabase = await createSupabaseServerClient();
  const nextDay = new Date(`${endDate}T00:00:00Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  const { data, error } = await supabase
    .from("payment")
    .select("method, amount_paise, created_at")
    .eq("school_id", schoolId)
    .in("status", ["recorded", "captured"])
    .gte("created_at", `${startDate}T00:00:00Z`)
    .lt("created_at", nextDay.toISOString());
  if (error) throw error;

  const rows = (data ?? []) as unknown as { method: string; amount_paise: number; created_at: string }[];

  const byMethod = new Map<string, { count: number; total: number }>();
  const byDate = new Map<string, { count: number; total: number }>();
  let grandTotalPaise = 0;
  for (const row of rows) {
    const dateKey = row.created_at.slice(0, 10);
    const m = byMethod.get(row.method) ?? { count: 0, total: 0 };
    byMethod.set(row.method, { count: m.count + 1, total: m.total + row.amount_paise });
    const d = byDate.get(dateKey) ?? { count: 0, total: 0 };
    byDate.set(dateKey, { count: d.count + 1, total: d.total + row.amount_paise });
    grandTotalPaise += row.amount_paise;
  }

  return {
    byMethod: Array.from(byMethod.entries()).map(([method, v]) => ({ method: method as PaymentMethod, count: v.count, totalPaise: v.total })),
    byDate: Array.from(byDate.entries())
      .map(([date, v]) => ({ date, count: v.count, totalPaise: v.total }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    grandTotalPaise,
    grandTotalCount: rows.length,
  };
}

/** P1 baseline "concessions" report -- every (student, fee head) with a concession applied this
 *  academic year, aggregated across their installments. */
export async function getConcessionsReport(schoolId: string, academicYearId: string): Promise<ConcessionReportRow[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("invoice_line")
    .select(
      "concession_amount_paise, fee_head:fee_head_id(name), invoice:invoice_id!inner(student_id, school_id, academic_year_id, student:student_id(admission_number, first_name, last_name))",
    )
    .eq("invoice.school_id", schoolId)
    .eq("invoice.academic_year_id", academicYearId)
    .gt("concession_amount_paise", 0);
  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    concession_amount_paise: number;
    fee_head: { name: string } | null;
    invoice: { student_id: string; student: { admission_number: string; first_name: string; last_name: string } | null };
  }[];
  if (rows.length === 0) return [];

  const studentIds = Array.from(new Set(rows.map((r) => r.invoice.student_id)));
  const { data: enrollmentRows, error: enrollmentError } = await supabase
    .from("enrollment")
    .select("student_id, class:class_id(name), section:section_id(name)")
    .eq("school_id", schoolId)
    .eq("academic_year_id", academicYearId)
    .in("student_id", studentIds);
  if (enrollmentError) throw enrollmentError;
  const classByStudent = new Map(
    ((enrollmentRows ?? []) as unknown as { student_id: string; class: { name: string } | null; section: { name: string } | null }[]).map((e) => [
      e.student_id,
      { className: e.class?.name ?? "", sectionName: e.section?.name ?? "" },
    ]),
  );

  const totals = new Map<string, ConcessionReportRow>();
  for (const r of rows) {
    const key = `${r.invoice.student_id}::${r.fee_head?.name ?? ""}`;
    const existing = totals.get(key);
    if (existing) {
      existing.totalConcessionPaise += r.concession_amount_paise;
      continue;
    }
    const enrollment = classByStudent.get(r.invoice.student_id);
    totals.set(key, {
      studentId: r.invoice.student_id,
      admissionNumber: r.invoice.student?.admission_number ?? "",
      studentName: r.invoice.student ? `${r.invoice.student.first_name} ${r.invoice.student.last_name}` : "",
      className: enrollment?.className ?? "",
      sectionName: enrollment?.sectionName ?? "",
      feeHeadName: r.fee_head?.name ?? "",
      totalConcessionPaise: r.concession_amount_paise,
    });
  }

  return Array.from(totals.values()).sort((a, b) => a.studentName.localeCompare(b.studentName));
}
