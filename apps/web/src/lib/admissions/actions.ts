"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import { getSession, getAccessToken } from "@/lib/core/auth/session";
import { requirePermission } from "@/lib/core/auth/permissions";
import { workerEnv } from "@/lib/core/worker/env";
import { applicationInputSchema, confirmAdmissionInputSchema, enquiryInputSchema, stageEventInputSchema } from "./schemas";

export interface AdmissionsFormState {
  error?: string;
}

const LIST_PATH = "/people/admissions";
const PERMISSION = "school.manage_admissions";

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

async function writeAuditLog(schoolId: string, actorAuthUserId: string, action: string, entityType: string, entityId: string | null): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.from("audit_log").insert({ school_id: schoolId, actor_auth_user_id: actorAuthUserId, action, entity_type: entityType, entity_id: entityId, metadata: {} });
}

export async function createEnquiryAction(_prevState: AdmissionsFormState, formData: FormData): Promise<AdmissionsFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const parsed = enquiryInputSchema.safeParse({
    firstName: readField(formData, "firstName"),
    lastName: readField(formData, "lastName"),
    phone: readField(formData, "phone"),
    email: readField(formData, "email"),
    classInterestedId: readField(formData, "classInterestedId"),
    source: readField(formData, "source") || "other",
    notes: readField(formData, "notes"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("enquiry")
    .insert({
      school_id: session.schoolId,
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      class_interested_id: parsed.data.classInterestedId || null,
      source: parsed.data.source,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not create enquiry." };

  await writeAuditLog(session.schoolId, session.authUserId, "enquiry.created", "enquiry", (data as unknown as { id: string }).id);
  revalidatePath(LIST_PATH);
  return {};
}

export async function closeEnquiryAction(
  enquiryId: string,
  _prevState: AdmissionsFormState,
  _formData: FormData,
): Promise<AdmissionsFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("enquiry")
    .update({ status: "closed_lost" })
    .eq("id", enquiryId)
    .eq("school_id", session.schoolId);
  if (error) return { error: error.message };

  revalidatePath(LIST_PATH);
  return {};
}

/**
 * Creates an application, optionally from an enquiry (enquiryId marks that enquiry converted).
 * Seeds one application_document row per configured admission_document_type -- the checklist is
 * instantiated at creation, not computed live on every page load, so "verify this document" has
 * a stable row to update.
 */
export async function createApplicationAction(_prevState: AdmissionsFormState, formData: FormData): Promise<AdmissionsFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const enquiryId = readField(formData, "enquiryId");
  const parsed = applicationInputSchema.safeParse({
    enquiryId,
    academicYearId: readField(formData, "academicYearId"),
    applicantFirstName: readField(formData, "applicantFirstName"),
    applicantLastName: readField(formData, "applicantLastName"),
    dob: readField(formData, "dob"),
    gender: readField(formData, "gender"),
    categoryId: readField(formData, "categoryId"),
    classApplyingForId: readField(formData, "classApplyingForId"),
    guardianName: readField(formData, "guardianName"),
    guardianPhone: readField(formData, "guardianPhone"),
    guardianEmail: readField(formData, "guardianEmail"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();

  const { data: firstStage } = await supabase
    .from("admission_stage")
    .select("id")
    .eq("school_id", session.schoolId)
    .eq("stage_type", "in_progress")
    .order("sort_order")
    .limit(1)
    .maybeSingle();
  const firstStageId = (firstStage as unknown as { id: string } | null)?.id;
  if (!firstStageId) return { error: "No admission stage configured -- add one in Settings > Master Data first." };

  const { data: application, error: insertError } = await supabase
    .from("application")
    .insert({
      school_id: session.schoolId,
      enquiry_id: parsed.data.enquiryId || null,
      academic_year_id: parsed.data.academicYearId,
      applicant_first_name: parsed.data.applicantFirstName,
      applicant_last_name: parsed.data.applicantLastName,
      dob: parsed.data.dob || null,
      gender: parsed.data.gender || null,
      category_id: parsed.data.categoryId || null,
      class_applying_for_id: parsed.data.classApplyingForId,
      guardian_name: parsed.data.guardianName || null,
      guardian_phone: parsed.data.guardianPhone || null,
      guardian_email: parsed.data.guardianEmail || null,
      current_stage_id: firstStageId,
    })
    .select("id")
    .single();
  if (insertError || !application) return { error: insertError?.message ?? "Could not create application." };

  const applicationId = (application as unknown as { id: string }).id;

  if (parsed.data.enquiryId) {
    await supabase.from("enquiry").update({ status: "converted" }).eq("id", parsed.data.enquiryId).eq("school_id", session.schoolId);
  }

  const schoolId = session.schoolId;
  const { data: documentTypes } = await supabase.from("admission_document_type").select("id").eq("school_id", schoolId);
  const checklistRows = ((documentTypes ?? []) as unknown as { id: string }[]).map((t) => ({
    school_id: schoolId,
    application_id: applicationId,
    document_type_id: t.id,
  }));
  if (checklistRows.length > 0) await supabase.from("application_document").insert(checklistRows);

  await writeAuditLog(session.schoolId, session.authUserId, "application.created", "application", applicationId);
  revalidatePath(LIST_PATH);
  redirect(`/people/admissions/${applicationId}`);
}

/**
 * Moves an application to a non-terminal or rejected/withdrawn stage and logs the transition
 * (also carrying the admission test/interview score+notes, if given). Moving to the 'admitted'
 * stage is deliberately blocked here -- that only happens through confirmAdmissionAction, which
 * also creates the student record; allowing it through this generic path would leave an
 * application "Admitted" with no actual student behind it.
 */
export async function recordStageEventAction(
  applicationId: string,
  _prevState: AdmissionsFormState,
  formData: FormData,
): Promise<AdmissionsFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const parsed = stageEventInputSchema.safeParse({
    stageId: readField(formData, "stageId"),
    score: readField(formData, "score"),
    notes: readField(formData, "notes"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { data: stage, error: stageError } = await supabase
    .from("admission_stage")
    .select("id, stage_type")
    .eq("id", parsed.data.stageId)
    .eq("school_id", session.schoolId)
    .maybeSingle();
  if (stageError) return { error: stageError.message };
  const stageRow = stage as unknown as { id: string; stage_type: string } | null;
  if (!stageRow) return { error: "Stage not found." };
  if (stageRow.stage_type === "admitted") return { error: "Use \"Confirm Admission\" to move to the admitted stage." };

  const { error: updateError } = await supabase
    .from("application")
    .update({ current_stage_id: parsed.data.stageId })
    .eq("id", applicationId)
    .eq("school_id", session.schoolId);
  if (updateError) return { error: updateError.message };

  await supabase.from("application_stage_event").insert({
    school_id: session.schoolId,
    application_id: applicationId,
    stage_id: parsed.data.stageId,
    score: parsed.data.score || null,
    notes: parsed.data.notes || null,
    recorded_by_auth_user_id: session.authUserId,
  });

  await writeAuditLog(session.schoolId, session.authUserId, "application.stage_changed", "application", applicationId);
  revalidatePath(`/people/admissions/${applicationId}`);
  return {};
}

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_DOCUMENT_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9._-]/g, "_").slice(-100);
  return cleaned || "file";
}

/** Uploads the file to the existing polymorphic `documents` bucket (owner_type='application') and marks the matching checklist row uploaded. */
export async function uploadApplicationDocumentAction(
  applicationId: string,
  applicationDocumentId: string,
  _prevState: AdmissionsFormState,
  formData: FormData,
): Promise<AdmissionsFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file." };
  if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.type)) return { error: "Only JPG, PNG, WEBP, or PDF files are allowed." };
  if (file.size > MAX_DOCUMENT_BYTES) return { error: "File is too large (max 10 MB)." };

  const supabase = await createSupabaseServerClient();
  const documentId = crypto.randomUUID();
  const storagePath = `${session.schoolId}/application/${applicationId}/${documentId}-${sanitizeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage.from("documents").upload(storagePath, file, { contentType: file.type });
  if (uploadError) return { error: uploadError.message };

  const { error: insertError } = await supabase.from("document").insert({
    id: documentId,
    school_id: session.schoolId,
    owner_type: "application",
    owner_id: applicationId,
    category: "other",
    storage_path: storagePath,
    mime_type: file.type,
    size_bytes: file.size,
    uploaded_by_auth_user_id: session.authUserId,
  });
  if (insertError) {
    await supabase.storage.from("documents").remove([storagePath]);
    return { error: insertError.message };
  }

  const { error: checklistError } = await supabase
    .from("application_document")
    .update({ status: "uploaded", document_id: documentId })
    .eq("id", applicationDocumentId)
    .eq("application_id", applicationId)
    .eq("school_id", session.schoolId);
  if (checklistError) return { error: checklistError.message };

  revalidatePath(`/people/admissions/${applicationId}`);
  return {};
}

export async function verifyApplicationDocumentAction(
  applicationId: string,
  applicationDocumentId: string,
  _prevState: AdmissionsFormState,
  _formData: FormData,
): Promise<AdmissionsFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("application_document")
    .update({ status: "verified", verified_by_auth_user_id: session.authUserId, verified_at: new Date().toISOString() })
    .eq("id", applicationDocumentId)
    .eq("application_id", applicationId)
    .eq("school_id", session.schoolId);
  if (error) return { error: error.message };

  revalidatePath(`/people/admissions/${applicationId}`);
  return {};
}

/**
 * Confirms admission: fn_confirm_admission (packages/db) creates the student + enrollment
 * atomically; this action then links the guardian (upsert guardian + student_guardian, same
 * "match by slot" idea as students/actions.ts's upsertGuardianSlot, but a single slot since
 * application only captures one guardian) and, if an email is on file, asks apps/worker to
 * create the parent-portal account link -- the invite email itself is Portal's job (P2, next
 * module), so a missing/failed portal-account call here is logged as a warning, not a reason to
 * fail the whole confirmation; the student record is the part that must not be lost.
 */
export async function confirmAdmissionAction(
  applicationId: string,
  _prevState: AdmissionsFormState,
  formData: FormData,
): Promise<AdmissionsFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const parsed = confirmAdmissionInputSchema.safeParse({ sectionId: readField(formData, "sectionId") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();

  const { data: application, error: appError } = await supabase
    .from("application")
    .select("guardian_name, guardian_phone, guardian_email")
    .eq("id", applicationId)
    .eq("school_id", session.schoolId)
    .maybeSingle();
  if (appError) return { error: appError.message };
  const appRow = application as unknown as { guardian_name: string | null; guardian_phone: string | null; guardian_email: string | null } | null;
  if (!appRow) return { error: "Application not found." };

  const { data: studentId, error: confirmError } = await supabase.rpc("fn_confirm_admission", {
    p_application_id: applicationId,
    p_school_id: session.schoolId,
    p_section_id: parsed.data.sectionId,
    p_actor_auth_user_id: session.authUserId,
  });
  if (confirmError || !studentId) return { error: confirmError?.message ?? "Could not confirm admission." };

  if (appRow.guardian_name) {
    const { data: guardian, error: guardianError } = await supabase
      .from("guardian")
      .insert({ school_id: session.schoolId, first_name: appRow.guardian_name })
      .select("id")
      .single();

    if (!guardianError && guardian) {
      const guardianId = (guardian as unknown as { id: string }).id;
      await supabase.from("student_guardian").insert({
        student_id: studentId,
        guardian_id: guardianId,
        school_id: session.schoolId,
        relationship_type: "guardian",
        phone: appRow.guardian_phone,
        email: appRow.guardian_email,
        is_primary_contact: true,
      });

      if (appRow.guardian_email) {
        const accessToken = await getAccessToken();
        if (accessToken) {
          try {
            await fetch(`${workerEnv.WORKER_URL}/internal/guardians/${guardianId}/portal-account`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
                "X-Internal-Secret": workerEnv.WORKER_INTERNAL_SECRET,
              },
              body: JSON.stringify({ email: appRow.guardian_email }),
            });
          } catch (err) {
            console.error("[admissions] guardian portal-account request failed:", err);
          }
        }
      }
    }
  }

  await writeAuditLog(session.schoolId, session.authUserId, "application.admission_confirmed", "application", applicationId);
  revalidatePath(LIST_PATH);
  redirect(`/people/students/${studentId}`);
}
