"use server";

import { revalidatePath } from "next/cache";
import type { Json } from "@schoolerp/types";
import { createRazorpayProvider } from "@schoolerp/integrations";
import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import { getSession } from "@/lib/core/auth/session";
import { getPortalSession } from "@/lib/core/auth/portalSession";
import { requirePermission } from "@/lib/core/auth/permissions";
import { getCurrentAcademicYearId } from "@/lib/core/school/getCurrentAcademicYear";
import { getRazorpayEnv } from "@/lib/core/payments/env";
import { RECEIPT_TEMPLATES } from "./receiptTemplates";
import {
  addAdjustmentInputSchema,
  addFineInputSchema,
  concessionRuleInputSchema,
  feeHeadInputSchema,
  feeStructureInputSchema,
  feeStructureItemInputSchema,
  recordPaymentInputSchema,
} from "./schemas";

export interface FeesFormState {
  error?: string;
}

const PAGE_PATH = "/finance/fees";
const PERMISSION = "school.manage_fees";

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

async function writeAuditLog(schoolId: string, actorAuthUserId: string, action: string, entityId: string | null, metadata: Json): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.from("audit_log").insert({ school_id: schoolId, actor_auth_user_id: actorAuthUserId, action, entity_type: "fees", entity_id: entityId, metadata });
}

async function requireSchoolAndYear(): Promise<{ schoolId: string; authUserId: string; academicYearId: string } | { error: string }> {
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };
  const academicYearId = await getCurrentAcademicYearId(session.schoolId);
  if (!academicYearId) return { error: "No current academic year set for this school." };
  return { schoolId: session.schoolId, authUserId: session.authUserId, academicYearId };
}

// ---------------------------------------------------------------------------
// Fee heads
// ---------------------------------------------------------------------------

export async function createFeeHeadAction(_prevState: FeesFormState, formData: FormData): Promise<FeesFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const parsed = feeHeadInputSchema.safeParse({ name: readField(formData, "name"), isRecurring: readField(formData, "isRecurring") === "on" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("fee_head")
    .insert({ school_id: session.schoolId, name: parsed.data.name, is_recurring: parsed.data.isRecurring })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not create fee head." };

  await writeAuditLog(session.schoolId, session.authUserId, "fees.fee_head.created", data.id, { name: parsed.data.name });
  revalidatePath(PAGE_PATH);
  return {};
}

export async function deleteFeeHeadAction(id: string, _prevState: FeesFormState, _formData: FormData): Promise<FeesFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("fee_head").delete().eq("id", id).eq("school_id", session.schoolId);
  if (error) return { error: error.code === "23503" ? "Cannot delete -- already used in a fee structure." : error.message };

  await writeAuditLog(session.schoolId, session.authUserId, "fees.fee_head.deleted", id, {});
  revalidatePath(PAGE_PATH);
  return {};
}

// ---------------------------------------------------------------------------
// Fee structures + items
// ---------------------------------------------------------------------------

export async function createFeeStructureAction(_prevState: FeesFormState, formData: FormData): Promise<FeesFormState> {
  await requirePermission(PERMISSION);
  const ctx = await requireSchoolAndYear();
  if ("error" in ctx) return ctx;

  const categoryId = readField(formData, "categoryId");
  const parsed = feeStructureInputSchema.safeParse({
    classId: readField(formData, "classId"),
    categoryId: categoryId || undefined,
    name: readField(formData, "name"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("fee_structure")
    .insert({
      school_id: ctx.schoolId,
      academic_year_id: ctx.academicYearId,
      class_id: parsed.data.classId,
      category_id: parsed.data.categoryId ?? null,
      name: parsed.data.name,
    })
    .select("id")
    .single();
  if (error || !data) {
    if (error?.code === "23505") return { error: "A fee structure already exists for this class/category." };
    return { error: error?.message ?? "Could not create fee structure." };
  }

  await writeAuditLog(ctx.schoolId, ctx.authUserId, "fees.fee_structure.created", data.id, { classId: parsed.data.classId });
  revalidatePath(PAGE_PATH);
  return {};
}

export async function deleteFeeStructureAction(id: string, _prevState: FeesFormState, _formData: FormData): Promise<FeesFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("fee_structure").delete().eq("id", id).eq("school_id", session.schoolId);
  if (error) return { error: error.code === "23503" ? "Cannot delete -- students are already assigned to it." : error.message };

  await writeAuditLog(session.schoolId, session.authUserId, "fees.fee_structure.deleted", id, {});
  revalidatePath(PAGE_PATH);
  return {};
}

export async function addFeeStructureItemAction(
  feeStructureId: string,
  _prevState: FeesFormState,
  formData: FormData,
): Promise<FeesFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const oneTimeRaw = readField(formData, "oneTimeInstallmentNumber");
  const parsed = feeStructureItemInputSchema.safeParse({
    feeHeadId: readField(formData, "feeHeadId"),
    amountPaise: Number(readField(formData, "amountPaise")) * 100,
    oneTimeInstallmentNumber: oneTimeRaw ? Number(oneTimeRaw) : undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  // Ownership check via the parent row -- fee_structure_item has no school_id of its own, RLS
  // already enforces this the same way, this just gives a clean error before hitting it.
  const { data: structure } = await supabase.from("fee_structure").select("id").eq("id", feeStructureId).eq("school_id", session.schoolId).maybeSingle();
  if (!structure) return { error: "Fee structure not found." };

  const { error } = await supabase.from("fee_structure_item").insert({
    fee_structure_id: feeStructureId,
    fee_head_id: parsed.data.feeHeadId,
    amount_paise: parsed.data.amountPaise,
    one_time_installment_number: parsed.data.oneTimeInstallmentNumber ?? null,
  });
  if (error) {
    if (error.code === "23505") return { error: "This fee head is already on this structure." };
    return { error: error.message };
  }

  await writeAuditLog(session.schoolId, session.authUserId, "fees.fee_structure_item.added", feeStructureId, { feeHeadId: parsed.data.feeHeadId });
  revalidatePath(PAGE_PATH);
  return {};
}

export async function deleteFeeStructureItemAction(id: string, _prevState: FeesFormState, _formData: FormData): Promise<FeesFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("fee_structure_item").delete().eq("id", id);
  if (error) return { error: error.message };

  await writeAuditLog(session.schoolId, session.authUserId, "fees.fee_structure_item.deleted", id, {});
  revalidatePath(PAGE_PATH);
  return {};
}

// ---------------------------------------------------------------------------
// Concession rules
// ---------------------------------------------------------------------------

export async function createConcessionRuleAction(_prevState: FeesFormState, formData: FormData): Promise<FeesFormState> {
  await requirePermission(PERMISSION);
  const ctx = await requireSchoolAndYear();
  if ("error" in ctx) return ctx;

  const type = readField(formData, "type") as "percentage" | "fixed";
  const feeHeadId = readField(formData, "feeHeadId");
  const parsed = concessionRuleInputSchema.safeParse({
    categoryId: readField(formData, "categoryId"),
    feeHeadId: feeHeadId || undefined,
    type,
    percentageValue: type === "percentage" ? Number(readField(formData, "value")) : undefined,
    fixedValuePaise: type === "fixed" ? Number(readField(formData, "value")) * 100 : undefined,
    label: readField(formData, "label"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("concession_rule")
    .insert({
      school_id: ctx.schoolId,
      academic_year_id: ctx.academicYearId,
      category_id: parsed.data.categoryId,
      fee_head_id: parsed.data.feeHeadId ?? null,
      type: parsed.data.type,
      percentage_value: parsed.data.percentageValue ?? null,
      fixed_value_paise: parsed.data.fixedValuePaise ?? null,
      label: parsed.data.label,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not create concession rule." };

  await writeAuditLog(ctx.schoolId, ctx.authUserId, "fees.concession_rule.created", data.id, { categoryId: parsed.data.categoryId });
  revalidatePath(PAGE_PATH);
  return {};
}

export async function deleteConcessionRuleAction(id: string, _prevState: FeesFormState, _formData: FormData): Promise<FeesFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("concession_rule").delete().eq("id", id).eq("school_id", session.schoolId);
  if (error) return { error: error.message };

  await writeAuditLog(session.schoolId, session.authUserId, "fees.concession_rule.deleted", id, {});
  revalidatePath(PAGE_PATH);
  return {};
}

// ---------------------------------------------------------------------------
// Installments + invoice generation
// ---------------------------------------------------------------------------

export async function generateInstallmentsAction(_prevState: FeesFormState, _formData: FormData): Promise<FeesFormState> {
  await requirePermission(PERMISSION);
  const ctx = await requireSchoolAndYear();
  if ("error" in ctx) return ctx;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("fn_generate_monthly_installments", { p_school_id: ctx.schoolId, p_academic_year_id: ctx.academicYearId });
  if (error) return { error: error.message };

  revalidatePath(PAGE_PATH);
  return {};
}

export interface GenerateInvoicesState extends FeesFormState {
  processed?: number;
  invoiced?: number;
  skippedNoStructure?: number;
  remaining?: number;
  done?: boolean;
  lastStudentId?: string | undefined;
}

/**
 * Called repeatedly by the client (same resumable-chunk pattern as import/attendance) until
 * `done`. `lastStudentId` is a cursor, not a "still needs an invoice" filter -- a student with no
 * matching fee_structure never gets one, so excluding by invoice-existence alone re-selected the
 * same unconfigured students forever (the "Processed 5000 -- 2000 remaining" bug). The cursor
 * guarantees every call examines a new slice of enrolled students regardless of outcome.
 */
export async function generateInvoicesAction(prevState: GenerateInvoicesState, formData: FormData): Promise<GenerateInvoicesState> {
  await requirePermission(PERMISSION);
  const ctx = await requireSchoolAndYear();
  if ("error" in ctx) return ctx;

  const classId = readField(formData, "classId");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("fn_generate_yearly_invoices", {
    p_school_id: ctx.schoolId,
    p_academic_year_id: ctx.academicYearId,
    ...(prevState.lastStudentId ? { p_after_student_id: prevState.lastStudentId } : {}),
    ...(classId ? { p_class_id: classId } : {}),
    p_limit: 50,
  });
  if (error) return { error: error.message };

  const result = data as unknown as {
    processed: number;
    invoiced: number;
    skippedNoStructure: number;
    remaining: number;
    done: boolean;
    lastStudentId: string | null;
  };
  if (result.done) {
    await writeAuditLog(ctx.schoolId, ctx.authUserId, "fees.invoices_generated", null, {
      academicYearId: ctx.academicYearId,
      ...(classId ? { classId } : {}),
    });
    revalidatePath(PAGE_PATH);
  }
  return {
    processed: result.processed,
    invoiced: result.invoiced,
    skippedNoStructure: result.skippedNoStructure,
    remaining: result.remaining,
    done: result.done,
    lastStudentId: result.lastStudentId ?? prevState.lastStudentId,
  };
}

// ---------------------------------------------------------------------------
// Collection: payments, fines, adjustments
// ---------------------------------------------------------------------------

export interface RecordPaymentState extends FeesFormState {
  paymentId?: string;
}

export async function recordPaymentAction(_prevState: RecordPaymentState, formData: FormData): Promise<RecordPaymentState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const amountRupees = Number(readField(formData, "amountRupees"));
  const parsed = recordPaymentInputSchema.safeParse({
    invoiceId: readField(formData, "invoiceId"),
    amountPaise: Math.round(amountRupees * 100),
    method: readField(formData, "method"),
    referenceNumber: readField(formData, "referenceNumber") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const receiptNumber = await supabase.rpc("fn_next_school_number", { p_school_id: session.schoolId, p_sequence_key: "fee_receipt" });
  if (receiptNumber.error) return { error: receiptNumber.error.message };

  const { data: invoiceRow } = await supabase.from("invoice").select("student_id").eq("id", parsed.data.invoiceId).eq("school_id", session.schoolId).maybeSingle();
  if (!invoiceRow) return { error: "Invoice not found." };
  const studentId = (invoiceRow as unknown as { student_id: string }).student_id;

  const { data, error } = await supabase
    .from("payment")
    .insert({
      school_id: session.schoolId,
      invoice_id: parsed.data.invoiceId,
      student_id: studentId,
      amount_paise: parsed.data.amountPaise,
      method: parsed.data.method,
      reference_number: parsed.data.referenceNumber ?? null,
      status: "recorded",
      receipt_number: receiptNumber.data as unknown as string,
      received_by_auth_user_id: session.authUserId,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not record payment." };

  await writeAuditLog(session.schoolId, session.authUserId, "fees.payment.recorded", data.id, {
    invoiceId: parsed.data.invoiceId,
    amountPaise: parsed.data.amountPaise,
    method: parsed.data.method,
  });
  revalidatePath(PAGE_PATH);
  return { paymentId: data.id };
}

export async function addFineAction(_prevState: FeesFormState, formData: FormData): Promise<FeesFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const amountRupees = Number(readField(formData, "amountRupees"));
  const parsed = addFineInputSchema.safeParse({
    invoiceId: readField(formData, "invoiceId"),
    amountPaise: Math.round(amountRupees * 100),
    reason: readField(formData, "reason"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("fine")
    .insert({
      school_id: session.schoolId,
      invoice_id: parsed.data.invoiceId,
      amount_paise: parsed.data.amountPaise,
      reason: parsed.data.reason,
      applied_by_auth_user_id: session.authUserId,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not add fine." };

  await writeAuditLog(session.schoolId, session.authUserId, "fees.fine.added", data.id, { invoiceId: parsed.data.invoiceId, amountPaise: parsed.data.amountPaise });
  revalidatePath(PAGE_PATH);
  return {};
}

export async function addAdjustmentAction(_prevState: FeesFormState, formData: FormData): Promise<FeesFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const amountRupees = Number(readField(formData, "amountRupees"));
  const paymentId = readField(formData, "paymentId");
  const parsed = addAdjustmentInputSchema.safeParse({
    invoiceId: readField(formData, "invoiceId"),
    paymentId: paymentId || undefined,
    type: readField(formData, "type"),
    amountPaise: Math.round(amountRupees * 100),
    reason: readField(formData, "reason"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("payment_adjustment")
    .insert({
      school_id: session.schoolId,
      invoice_id: parsed.data.invoiceId,
      payment_id: parsed.data.paymentId ?? null,
      type: parsed.data.type,
      amount_paise: parsed.data.amountPaise,
      reason: parsed.data.reason,
      created_by_auth_user_id: session.authUserId,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not record adjustment." };

  await writeAuditLog(session.schoolId, session.authUserId, "fees.adjustment.created", data.id, {
    invoiceId: parsed.data.invoiceId,
    type: parsed.data.type,
    amountPaise: parsed.data.amountPaise,
  });
  revalidatePath(PAGE_PATH);
  return {};
}

// ---------------------------------------------------------------------------
// Razorpay order creation -- see packages/integrations/payments/razorpayProvider.ts and
// apps/worker/src/http/razorpayWebhookRoute.ts for the rest of this flow. Nothing here ever
// marks an invoice paid; this only creates the order and a placeholder `payment` row the webhook
// later updates.
// ---------------------------------------------------------------------------

export interface CreateRazorpayOrderState extends FeesFormState {
  orderId?: string;
  keyId?: string;
  amountPaise?: number;
  paymentId?: string;
}

/**
 * Reachable from two callers: a staff member collecting payment on the school's fee-collection
 * screen (school.manage_fees), and now a parent paying online from the portal (§L) -- there is no
 * school_member session to require a permission of in that case, so it falls back to
 * getPortalSession(). Either way, `invoice_select`/`invoice_select_parent` RLS already scopes
 * which invoice row this caller can even see -- the `!invoiceRow` check below is real
 * authorization (a guardian querying a different family's invoice id gets nothing back), not just
 * a not-found guard. The actual `payment` insert is likewise authorized by a matching pair of RLS
 * policies (`payment_insert` for staff, `payment_insert_parent` for guardians -- the latter
 * additionally scoped to method='online'/status='pending_gateway' only, see the migration).
 */
export async function createRazorpayOrderAction(invoiceId: string, dueAmountPaise: number): Promise<CreateRazorpayOrderState> {
  const staffSession = await getSession();
  let schoolId: string;
  let receivedByAuthUserId: string;

  if (staffSession?.schoolId) {
    await requirePermission(PERMISSION);
    schoolId = staffSession.schoolId;
    receivedByAuthUserId = staffSession.authUserId;
  } else {
    const portalSession = await getPortalSession();
    if (!portalSession) return { error: "Not signed in." };
    schoolId = portalSession.schoolId;
    receivedByAuthUserId = portalSession.authUserId;
  }
  if (dueAmountPaise <= 0) return { error: "Nothing due on this invoice." };

  const supabase = await createSupabaseServerClient();
  const { data: invoiceRow } = await supabase.from("invoice").select("student_id").eq("id", invoiceId).eq("school_id", schoolId).maybeSingle();
  if (!invoiceRow) return { error: "Invoice not found." };
  const studentId = (invoiceRow as unknown as { student_id: string }).student_id;

  let razorpayEnv: ReturnType<typeof getRazorpayEnv>;
  try {
    razorpayEnv = getRazorpayEnv();
  } catch {
    return { error: "Online payment isn't configured for this school yet." };
  }

  const receiptNumberRes = await supabase.rpc("fn_next_school_number", { p_school_id: schoolId, p_sequence_key: "fee_receipt" });
  if (receiptNumberRes.error) return { error: receiptNumberRes.error.message };
  const receiptNumber = receiptNumberRes.data as unknown as string;

  const provider = createRazorpayProvider({ keyId: razorpayEnv.RAZORPAY_KEY_ID, keySecret: razorpayEnv.RAZORPAY_KEY_SECRET, webhookSecret: "" });
  let order: Awaited<ReturnType<typeof provider.createOrder>>;
  try {
    order = await provider.createOrder(receiptNumber, dueAmountPaise);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not create the payment order." };
  }

  // status stays 'pending_gateway' until the webhook confirms it -- this row exists so the
  // webhook has something to find and update by razorpay_order_id, not as a record of money
  // received (CLAUDE.md: never mark paid from a client-side callback).
  const { data: paymentRow, error: paymentError } = await supabase
    .from("payment")
    .insert({
      school_id: schoolId,
      invoice_id: invoiceId,
      student_id: studentId,
      amount_paise: dueAmountPaise,
      method: "online",
      status: "pending_gateway",
      razorpay_order_id: order.orderId,
      receipt_number: receiptNumber,
      received_by_auth_user_id: receivedByAuthUserId,
    })
    .select("id")
    .single();
  if (paymentError || !paymentRow) return { error: paymentError?.message ?? "Could not create the payment record." };

  return { orderId: order.orderId, keyId: razorpayEnv.RAZORPAY_KEY_ID, amountPaise: order.amountPaise, paymentId: paymentRow.id };
}

// ---------------------------------------------------------------------------
// Receipt design (template + watermark) -- lives on school_branding, gated by
// school.manage_branding, NOT school.manage_fees. This section is edited from Fees Setup for
// discoverability, but school.manage_fees is also granted to the accountant role, and an
// accountant changing the school's visual branding identity (which this table also holds: logo,
// colors, display name) is a different authorization boundary than collecting a payment. The
// Fees Setup page itself checks school.manage_branding before rendering this section; this is
// the server-side re-check (CLAUDE.md: hiding a control in the UI is presentation, not security).
// ---------------------------------------------------------------------------

export async function updateReceiptDesignAction(_prevState: FeesFormState, formData: FormData): Promise<FeesFormState> {
  await requirePermission("school.manage_branding");
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const template = readField(formData, "template");
  if (!RECEIPT_TEMPLATES.some((t) => t.key === template)) return { error: "Invalid receipt template." };
  const watermarkEnabled = formData.get("watermarkEnabled") === "on";

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("school_branding")
    .update({ receipt_template: template, receipt_watermark_enabled: watermarkEnabled })
    .eq("school_id", session.schoolId);
  if (error) return { error: error.message };

  await writeAuditLog(session.schoolId, session.authUserId, "fees.receipt_design_updated", null, {
    template,
    watermarkEnabled,
  });
  revalidatePath(PAGE_PATH);
  revalidatePath("/finance/fees/receipts/[paymentId]", "page");
  return {};
}
