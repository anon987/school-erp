"use server";

import { revalidatePath } from "next/cache";
import type { Json } from "@schoolerp/types";
import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import { getSession } from "@/lib/core/auth/session";
import { requirePermission, hasPermission } from "@/lib/core/auth/permissions";
import { DOCUMENT_TEMPLATES } from "@/lib/core/pdf/documentTemplates";
import { examInputSchema, examSubjectInputSchema, saveMarksInputSchema } from "./schemas";
import type { ExamStatus } from "./types";

export interface ExamsFormState {
  error?: string;
}

const MANAGE = "school.manage_exams";
const APPROVE = "school.approve_exam_results";

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

async function writeAuditLog(schoolId: string, actorAuthUserId: string, action: string, entityId: string | null, metadata: Json): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.from("audit_log").insert({ school_id: schoolId, actor_auth_user_id: actorAuthUserId, action, entity_type: "exam", entity_id: entityId, metadata });
}

export async function createExamAction(_prevState: ExamsFormState, formData: FormData): Promise<ExamsFormState> {
  await requirePermission(MANAGE);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const parsed = examInputSchema.safeParse({
    academicYearId: readField(formData, "academicYearId"),
    name: readField(formData, "name"),
    term: readField(formData, "term") || undefined,
    startDate: readField(formData, "startDate"),
    endDate: readField(formData, "endDate"),
    computeRanks: formData.get("computeRanks") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("exam")
    .insert({
      school_id: session.schoolId,
      academic_year_id: parsed.data.academicYearId,
      name: parsed.data.name,
      term: parsed.data.term ?? null,
      start_date: parsed.data.startDate || null,
      end_date: parsed.data.endDate || null,
      compute_ranks: parsed.data.computeRanks,
    })
    .select("id")
    .single();
  if (error || !data) {
    if (error?.code === "23505") return { error: "An exam with this name already exists for this academic year." };
    return { error: error?.message ?? "Could not create exam." };
  }

  const classIds = formData.getAll("classIds").filter((v): v is string => typeof v === "string" && v.length > 0);
  if (classIds.length > 0) {
    const { error: classError } = await supabase.from("exam_class").insert(classIds.map((classId) => ({ exam_id: data.id, class_id: classId })));
    if (classError) return { error: classError.message };
  }

  await writeAuditLog(session.schoolId, session.authUserId, "exam.created", data.id, { name: parsed.data.name, classIds });
  revalidatePath("/academics/exams/manage");
  return {};
}

export async function deleteExamAction(id: string, _prevState: ExamsFormState, _formData: FormData): Promise<ExamsFormState> {
  await requirePermission(MANAGE);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const supabase = await createSupabaseServerClient();
  // Only draft exams -- once subjects/marks exist, deleting would cascade away real data
  // (exam_subject/mark both reference exam on delete cascade) with no undo.
  const { error } = await supabase.from("exam").delete().eq("id", id).eq("school_id", session.schoolId).eq("status", "draft");
  if (error) return { error: error.message };

  await writeAuditLog(session.schoolId, session.authUserId, "exam.deleted", id, {});
  revalidatePath("/academics/exams/manage");
  return {};
}

const STATUS_ORDER: ExamStatus[] = ["draft", "marks_entry", "pending_approval", "approved", "published"];

/**
 * Every forward transition needs school.manage_exams for draft->marks_entry->pending_approval
 * (setup + submitting for approval) or school.approve_exam_results for
 * pending_approval->approved->published (a distinct approver, not whoever entered marks).
 * "Reopen" (approved/published -> marks_entry, for corrections) also requires
 * school.approve_exam_results -- the same role that can approve can also pull a result back for
 * a fix, but a teacher who only has manage_exams cannot unilaterally reopen an approved result.
 */
export async function updateExamStatusAction(examId: string, targetStatus: ExamStatus, _prevState: ExamsFormState, _formData: FormData): Promise<ExamsFormState> {
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const supabase = await createSupabaseServerClient();
  const { data: examRow, error: examError } = await supabase.from("exam").select("status").eq("id", examId).eq("school_id", session.schoolId).maybeSingle();
  if (examError) return { error: examError.message };
  if (!examRow) return { error: "Exam not found." };
  const currentStatus = (examRow as unknown as { status: ExamStatus }).status;

  const isReopen = (currentStatus === "approved" || currentStatus === "published") && targetStatus === "marks_entry";
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  const targetIndex = STATUS_ORDER.indexOf(targetStatus);
  const isForwardStep = targetIndex === currentIndex + 1;

  if (!isReopen && !isForwardStep) {
    return { error: `Can't move from "${currentStatus}" to "${targetStatus}" directly.` };
  }

  const requiresApprovalPermission = isReopen || currentStatus === "pending_approval" || currentStatus === "approved";
  const allowed = requiresApprovalPermission ? await hasPermission(APPROVE) : await hasPermission(MANAGE);
  if (!allowed) return { error: "You don't have permission to make this change." };

  if (targetStatus === "marks_entry" && !isReopen) {
    const { count } = await supabase.from("exam_subject").select("id", { count: "exact", head: true }).eq("exam_id", examId);
    if (!count) return { error: "Add at least one subject before opening marks entry." };
  }

  const { error } = await supabase.from("exam").update({ status: targetStatus }).eq("id", examId).eq("school_id", session.schoolId);
  if (error) return { error: error.message };

  await writeAuditLog(session.schoolId, session.authUserId, "exam.status_changed", examId, { from: currentStatus, to: targetStatus });
  revalidatePath(`/academics/exams/${examId}`);
  revalidatePath("/academics/exams/manage");
  return {};
}

export async function createExamSubjectAction(examId: string, _prevState: ExamsFormState, formData: FormData): Promise<ExamsFormState> {
  await requirePermission(MANAGE);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const hasInternal = formData.get("hasInternal") === "on";
  const parsed = examSubjectInputSchema.safeParse({
    classId: readField(formData, "classId"),
    subjectId: readField(formData, "subjectId"),
    maxMarks: readField(formData, "maxMarks"),
    passMarks: readField(formData, "passMarks"),
    hasInternal,
    internalMaxMarks: hasInternal ? readField(formData, "internalMaxMarks") : undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("exam_subject")
    .insert({
      exam_id: examId,
      class_id: parsed.data.classId,
      subject_id: parsed.data.subjectId,
      max_marks: parsed.data.maxMarks,
      pass_marks: parsed.data.passMarks,
      has_internal: parsed.data.hasInternal,
      internal_max_marks: parsed.data.hasInternal ? (parsed.data.internalMaxMarks ?? null) : null,
    })
    .select("id")
    .single();
  if (error || !data) {
    if (error?.code === "23505") return { error: "This subject is already added for this class in this exam." };
    return { error: error?.message ?? "Could not add subject." };
  }

  await writeAuditLog(session.schoolId, session.authUserId, "exam.subject_added", data.id, { examId });
  revalidatePath(`/academics/exams/${examId}`);
  return {};
}

export async function deleteExamSubjectAction(examId: string, id: string, _prevState: ExamsFormState, _formData: FormData): Promise<ExamsFormState> {
  await requirePermission(MANAGE);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("exam_subject").delete().eq("id", id).eq("exam_id", examId);
  if (error) return { error: error.message };

  await writeAuditLog(session.schoolId, session.authUserId, "exam.subject_removed", id, { examId });
  revalidatePath(`/academics/exams/${examId}`);
  return {};
}

export interface SaveMarksState extends ExamsFormState {
  written?: number;
  errorCount?: number;
}

/**
 * fn_save_marks does the actual bulk upsert (one round trip, per-row error handling) -- this
 * action is the permission/status gate in front of it: marks can only be saved while the exam is
 * genuinely in marks_entry (not draft, not already submitted for approval).
 */
export async function saveMarksAction(examId: string, _prevState: SaveMarksState, formData: FormData): Promise<SaveMarksState> {
  await requirePermission(MANAGE);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const raw = readField(formData, "payload");
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return { error: "Invalid submission." };
  }
  const parsed = saveMarksInputSchema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { data: examRow, error: examError } = await supabase.from("exam").select("status").eq("id", examId).eq("school_id", session.schoolId).maybeSingle();
  if (examError) return { error: examError.message };
  if (!examRow || (examRow as unknown as { status: string }).status !== "marks_entry") {
    return { error: "Marks can only be entered while the exam is in the marks-entry stage." };
  }

  const { data, error } = await supabase.rpc("fn_save_marks", {
    p_exam_subject_id: parsed.data.examSubjectId,
    p_entered_by_auth_user_id: session.authUserId,
    p_marks: parsed.data.marks.map((m) => ({
      student_id: m.studentId,
      marks_obtained: m.isAbsent ? null : (m.marksObtained ?? null),
      internal_marks_obtained: m.isAbsent ? null : (m.internalMarksObtained ?? null),
      is_absent: m.isAbsent,
      remarks: m.remarks ?? null,
    })),
  });
  if (error) return { error: error.message };

  const result = data as unknown as { written: number; errors: { student_id: string; error: string }[] };

  await writeAuditLog(session.schoolId, session.authUserId, "exam.marks_saved", parsed.data.examSubjectId, {
    examId,
    written: result.written,
    errorCount: result.errors.length,
  });
  revalidatePath(`/academics/exams/${examId}`);

  if (result.errors.length > 0) {
    return { written: result.written, errorCount: result.errors.length, error: `${result.errors.length} row(s) could not be saved -- check for marks over the maximum.` };
  }
  return { written: result.written, errorCount: 0 };
}

export async function updateReportCardSettingsAction(_prevState: ExamsFormState, formData: FormData): Promise<ExamsFormState> {
  await requirePermission(MANAGE);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const template = readField(formData, "template");
  if (!DOCUMENT_TEMPLATES.some((t) => t.key === template)) return { error: "Invalid report card template." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("report_card_settings").upsert(
    {
      school_id: session.schoolId,
      template,
      show_attendance: formData.get("showAttendance") === "on",
      show_remarks: formData.get("showRemarks") === "on",
      show_rank: formData.get("showRank") === "on",
      footer_note: readField(formData, "footerNote") || null,
    },
    { onConflict: "school_id" },
  );
  if (error) return { error: error.message };

  await writeAuditLog(session.schoolId, session.authUserId, "exam.report_card_settings_updated", null, {});
  revalidatePath("/academics/exams/report-cards");
  return {};
}
