"use server";

import { revalidatePath } from "next/cache";
import type { Json } from "@schoolerp/types";
import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import { getSession } from "@/lib/core/auth/session";
import { requirePermission } from "@/lib/core/auth/permissions";
import { DOCUMENT_TEMPLATES } from "@/lib/core/pdf/documentTemplates";

export interface AdmitCardFormState {
  error?: string;
}

const MANAGE = "school.manage_exams";

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

async function writeAuditLog(schoolId: string, actorAuthUserId: string, action: string, entityId: string | null, metadata: Json): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.from("audit_log").insert({ school_id: schoolId, actor_auth_user_id: actorAuthUserId, action, entity_type: "admit_card", entity_id: entityId, metadata });
}

export async function updateAdmitCardSettingsAction(_prevState: AdmitCardFormState, formData: FormData): Promise<AdmitCardFormState> {
  await requirePermission(MANAGE);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const template = readField(formData, "template");
  if (!DOCUMENT_TEMPLATES.some((t) => t.key === template)) return { error: "Invalid admit card template." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("admit_card_settings").upsert({ school_id: session.schoolId, template }, { onConflict: "school_id" });
  if (error) return { error: error.message };

  await writeAuditLog(session.schoolId, session.authUserId, "admit_card_settings.updated", null, { template });
  revalidatePath("/academics/exams/admit-card-settings");
  return {};
}

export async function updateExamAdmitCardSettingsAction(examId: string, _prevState: AdmitCardFormState, formData: FormData): Promise<AdmitCardFormState> {
  await requirePermission(MANAGE);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const template = readField(formData, "template");
  if (template && !DOCUMENT_TEMPLATES.some((t) => t.key === template)) return { error: "Invalid admit card template." };

  const feeLockMode = readField(formData, "feeLockMode");
  if (feeLockMode !== "off" && feeLockMode !== "block") return { error: "Invalid fee-lock mode." };

  const maxDueRupees = Number(readField(formData, "feeLockMaxDue") || "0");
  if (Number.isNaN(maxDueRupees) || maxDueRupees < 0) return { error: "Max allowed due must be a non-negative amount." };

  const availableFrom = readField(formData, "availableFrom");
  const availableUntil = readField(formData, "availableUntil");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("exam_admit_card_settings").upsert(
    {
      exam_id: examId,
      school_id: session.schoolId,
      template: template || null,
      release_enabled: formData.get("releaseEnabled") === "on",
      available_from: availableFrom || null,
      available_until: availableUntil || null,
      fee_lock_mode: feeLockMode,
      fee_lock_max_due_paise: Math.round(maxDueRupees * 100),
      instructions: readField(formData, "instructions") || null,
      reporting_time: readField(formData, "reportingTime") || null,
      exam_centre: readField(formData, "examCentre") || null,
      principal_name: readField(formData, "principalName") || null,
      controller_of_exams: readField(formData, "controllerOfExams") || null,
      hall_ticket_prefix: readField(formData, "hallTicketPrefix") || null,
      show_student_photo: formData.get("showStudentPhoto") === "on",
      show_signature_lines: formData.get("showSignatureLines") === "on",
    },
    { onConflict: "exam_id" },
  );
  if (error) return { error: error.message };

  if (formData.get("alsoMakeSchoolDefault") === "on" && template) {
    await supabase.from("admit_card_settings").upsert({ school_id: session.schoolId, template }, { onConflict: "school_id" });
  }

  await writeAuditLog(session.schoolId, session.authUserId, "exam_admit_card_settings.updated", examId, { examId });
  revalidatePath(`/academics/exams/${examId}/admit-cards`);
  return {};
}

export async function updateExamSubjectScheduleAction(examSubjectId: string, _prevState: AdmitCardFormState, formData: FormData): Promise<AdmitCardFormState> {
  await requirePermission(MANAGE);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const examId = readField(formData, "examId");
  const examDate = readField(formData, "examDate");
  const startTime = readField(formData, "startTime");
  const endTime = readField(formData, "endTime");
  const roomNo = readField(formData, "roomNo");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("exam_subject")
    .update({
      exam_date: examDate || null,
      start_time: startTime || null,
      end_time: endTime || null,
      room_no: roomNo || null,
    })
    .eq("id", examSubjectId);
  if (error) return { error: error.message };

  await writeAuditLog(session.schoolId, session.authUserId, "exam.subject_schedule_updated", examSubjectId, { examId });
  if (examId) revalidatePath(`/academics/exams/${examId}`);
  return {};
}

export async function toggleAdmitCardHoldAction(examId: string, studentId: string, hold: boolean, _prevState: AdmitCardFormState, formData: FormData): Promise<AdmitCardFormState> {
  await requirePermission(MANAGE);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const supabase = await createSupabaseServerClient();
  if (hold) {
    const reason = readField(formData, "reason") || null;
    const { error } = await supabase
      .from("admit_card_hold")
      .upsert({ exam_id: examId, student_id: studentId, school_id: session.schoolId, reason, held_by_auth_user_id: session.authUserId }, { onConflict: "exam_id,student_id" });
    if (error) return { error: error.message };
    await writeAuditLog(session.schoolId, session.authUserId, "admit_card.held", studentId, { examId, reason });
  } else {
    const { error } = await supabase.from("admit_card_hold").delete().eq("exam_id", examId).eq("student_id", studentId);
    if (error) return { error: error.message };
    await writeAuditLog(session.schoolId, session.authUserId, "admit_card.hold_released", studentId, { examId });
  }

  revalidatePath(`/academics/exams/${examId}/admit-cards`);
  return {};
}
