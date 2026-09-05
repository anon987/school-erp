"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import { getSession } from "@/lib/core/auth/session";
import { requirePortalSession } from "@/lib/core/auth/portalSession";
import { createHomeworkInputSchema, reviewSubmissionInputSchema } from "./schemas";

export interface HomeworkFormState {
  error?: string;
}

const LIST_PATH = "/academics/homework";

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/**
 * No explicit requirePermission() call here -- unlike most actions in this codebase, "can this
 * caller create homework for THIS staff_class_subject_id" isn't a single fixed permission key,
 * it's homework.manage OR (homework.manage_own AND they own that specific assignment). RLS
 * (homework_write, packages/db) is the actual authorization boundary; this just returns the
 * database's rejection as a clean error instead of a raw Postgres message.
 */
export async function createHomeworkAction(_prevState: HomeworkFormState, formData: FormData): Promise<HomeworkFormState> {
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const parsed = createHomeworkInputSchema.safeParse({
    staffClassSubjectId: readField(formData, "staffClassSubjectId"),
    title: readField(formData, "title"),
    description: readField(formData, "description"),
    dueDate: readField(formData, "dueDate"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();

  // The denormalized columns (class_id/section_id/subject_id/staff_id/academic_year_id) are also
  // populated by fn_homework_denormalize (packages/db) from staff_class_subject_id, but the
  // generated Insert type has no way to know that trigger exists, so it marks them required --
  // resolved explicitly here rather than sent as placeholders, same as Timetable's
  // upsertTimetableSlotAction.
  const { data: scs, error: scsError } = await supabase
    .from("staff_class_subject")
    .select("academic_year_id, class_id, section_id, subject_id, staff_id")
    .eq("id", parsed.data.staffClassSubjectId)
    .eq("school_id", session.schoolId)
    .maybeSingle();
  if (scsError) return { error: scsError.message };
  if (!scs) return { error: "That class/subject assignment was not found." };
  const assignment = scs as unknown as { academic_year_id: string; class_id: string; section_id: string; subject_id: string; staff_id: string };

  const { error } = await supabase.from("homework").insert({
    school_id: session.schoolId,
    staff_class_subject_id: parsed.data.staffClassSubjectId,
    title: parsed.data.title,
    description: parsed.data.description,
    due_date: parsed.data.dueDate,
    created_by_auth_user_id: session.authUserId,
    academic_year_id: assignment.academic_year_id,
    class_id: assignment.class_id,
    section_id: assignment.section_id,
    subject_id: assignment.subject_id,
    staff_id: assignment.staff_id,
  });
  if (error) {
    if (error.code === "42501") return { error: "You don't teach this class/subject, so you can't post homework for it." };
    return { error: error.message };
  }

  revalidatePath(LIST_PATH);
  return {};
}

export async function publishHomeworkAction(homeworkId: string, _prevState: HomeworkFormState, _formData: FormData): Promise<HomeworkFormState> {
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("fn_publish_homework", { p_homework_id: homeworkId, p_school_id: session.schoolId });
  if (error) return { error: error.message };

  revalidatePath(LIST_PATH);
  return {};
}

export async function reviewSubmissionAction(
  submissionId: string,
  _prevState: HomeworkFormState,
  formData: FormData,
): Promise<HomeworkFormState> {
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const parsed = reviewSubmissionInputSchema.safeParse({ teacherRemarks: readField(formData, "teacherRemarks") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("homework_submission")
    .update({ teacher_remarks: parsed.data.teacherRemarks, status: "reviewed", reviewed_by_auth_user_id: session.authUserId, reviewed_at: new Date().toISOString() })
    .eq("id", submissionId)
    .eq("school_id", session.schoolId);
  if (error) return { error: error.message };

  revalidatePath(LIST_PATH);
  return {};
}

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9._-]/g, "_").slice(-100);
  return cleaned || "file";
}

/** Parent submits on the student's behalf -- no separate student login exists (see docs/schoolerp_techstack.md §10 / product decision), same proxy shape as the Portal leave application. */
export async function submitHomeworkAction(
  submissionId: string,
  _prevState: HomeworkFormState,
  formData: FormData,
): Promise<HomeworkFormState> {
  const session = await requirePortalSession();

  const content = readField(formData, "content").trim();
  const file = formData.get("file");
  const hasFile = file instanceof File && file.size > 0;

  if (!content && !hasFile) return { error: "Add a note or attach a file." };

  const supabase = await createSupabaseServerClient();
  let documentId: string | null = null;

  if (hasFile) {
    const uploadedFile = file as File;
    if (!ALLOWED_ATTACHMENT_MIME_TYPES.includes(uploadedFile.type)) return { error: "Only JPG, PNG, WEBP, or PDF files are allowed." };
    if (uploadedFile.size > MAX_ATTACHMENT_BYTES) return { error: "File is too large (max 10 MB)." };

    documentId = crypto.randomUUID();
    const storagePath = `${session.schoolId}/homework_submission/${submissionId}/${documentId}-${sanitizeFileName(uploadedFile.name)}`;
    const { error: uploadError } = await supabase.storage.from("documents").upload(storagePath, uploadedFile, { contentType: uploadedFile.type });
    if (uploadError) return { error: uploadError.message };

    const { error: docInsertError } = await supabase.from("document").insert({
      id: documentId,
      school_id: session.schoolId,
      owner_type: "homework_submission",
      owner_id: submissionId,
      category: "other",
      storage_path: storagePath,
      mime_type: uploadedFile.type,
      size_bytes: uploadedFile.size,
      uploaded_by_auth_user_id: session.authUserId,
    });
    if (docInsertError) {
      await supabase.storage.from("documents").remove([storagePath]);
      return { error: docInsertError.message };
    }
  }

  const { error } = await supabase
    .from("homework_submission")
    .update({
      content: content || null,
      ...(documentId ? { document_id: documentId } : {}),
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", submissionId);
  if (error) return { error: error.message };

  revalidatePath(`/portal/students`);
  return {};
}
