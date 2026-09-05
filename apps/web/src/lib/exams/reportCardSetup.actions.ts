"use server";

import { revalidatePath } from "next/cache";
import type { Json } from "@schoolerp/types";
import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import { getSession } from "@/lib/core/auth/session";
import { requirePermission } from "@/lib/core/auth/permissions";
import { DOCUMENT_TEMPLATES } from "@/lib/core/pdf/documentTemplates";

export interface ReportCardSetupFormState {
  error?: string;
}

const MANAGE = "school.manage_exams";

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

async function writeAuditLog(schoolId: string, actorAuthUserId: string, action: string, entityId: string | null, metadata: Json): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.from("audit_log").insert({ school_id: schoolId, actor_auth_user_id: actorAuthUserId, action, entity_type: "report_card_setup", entity_id: entityId, metadata });
}

export async function createReportCardSetupAction(academicYearId: string, _prevState: ReportCardSetupFormState, formData: FormData): Promise<ReportCardSetupFormState> {
  await requirePermission(MANAGE);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const name = readField(formData, "name").trim();
  if (!name) return { error: "Name is required." };

  const template = readField(formData, "template");
  if (!DOCUMENT_TEMPLATES.some((t) => t.key === template)) return { error: "Invalid template." };

  let exams: { examId: string; weightPercent: number }[];
  try {
    exams = JSON.parse(readField(formData, "exams"));
  } catch {
    return { error: "Invalid exam weights." };
  }
  if (!Array.isArray(exams) || exams.length === 0) return { error: "Add at least one exam." };
  if (exams.some((e) => !e.examId || typeof e.weightPercent !== "number" || e.weightPercent <= 0 || e.weightPercent > 100)) {
    return { error: "Every exam needs a weight between 0 and 100." };
  }
  const totalWeight = exams.reduce((sum, e) => sum + e.weightPercent, 0);
  if (Math.abs(totalWeight - 100) > 0.01) return { error: `Weights must add up to 100% (currently ${totalWeight}%).` };

  const supabase = await createSupabaseServerClient();
  const { data: setup, error } = await supabase
    .from("report_card_setup")
    .insert({
      school_id: session.schoolId,
      academic_year_id: academicYearId,
      name,
      template,
      compute_ranks: formData.get("computeRanks") === "on",
      include_hpc: formData.get("includeHpc") === "on",
    })
    .select("id")
    .single();
  if (error || !setup) {
    if (error?.code === "23505") return { error: "A report card setup with this name already exists for this academic year." };
    return { error: error?.message ?? "Could not create the setup." };
  }

  const { error: examsError } = await supabase.from("report_card_setup_exam").insert(exams.map((e) => ({ setup_id: setup.id, exam_id: e.examId, weight_percent: e.weightPercent })));
  if (examsError) {
    await supabase.from("report_card_setup").delete().eq("id", setup.id);
    return { error: examsError.message };
  }

  await writeAuditLog(session.schoolId, session.authUserId, "report_card_setup.created", setup.id, { name, exams });
  revalidatePath("/academics/exams/report-cards");
  return {};
}

export async function updateReportCardSetupPublishAction(setupId: string, isPublished: boolean, _prevState: ReportCardSetupFormState, _formData: FormData): Promise<ReportCardSetupFormState> {
  await requirePermission(MANAGE);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("report_card_setup").update({ is_published: isPublished }).eq("id", setupId).eq("school_id", session.schoolId);
  if (error) return { error: error.message };

  await writeAuditLog(session.schoolId, session.authUserId, isPublished ? "report_card_setup.published" : "report_card_setup.unpublished", setupId, {});
  revalidatePath("/academics/exams/report-cards");
  return {};
}

export async function updateReportCardSetupIncludeHpcAction(
  setupId: string,
  includeHpc: boolean,
  _prevState: ReportCardSetupFormState,
  _formData: FormData,
): Promise<ReportCardSetupFormState> {
  await requirePermission(MANAGE);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("report_card_setup").update({ include_hpc: includeHpc }).eq("id", setupId).eq("school_id", session.schoolId);
  if (error) return { error: error.message };

  await writeAuditLog(session.schoolId, session.authUserId, includeHpc ? "report_card_setup.hpc_enabled" : "report_card_setup.hpc_disabled", setupId, {});
  revalidatePath("/academics/exams/report-cards");
  return {};
}

export async function deleteReportCardSetupAction(setupId: string, _prevState: ReportCardSetupFormState, _formData: FormData): Promise<ReportCardSetupFormState> {
  await requirePermission(MANAGE);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("report_card_setup").delete().eq("id", setupId).eq("school_id", session.schoolId);
  if (error) return { error: error.message };

  await writeAuditLog(session.schoolId, session.authUserId, "report_card_setup.deleted", setupId, {});
  revalidatePath("/academics/exams/report-cards");
  return {};
}
