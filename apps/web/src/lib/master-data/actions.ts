"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import { getSession } from "@/lib/core/auth/session";
import { requirePermission } from "@/lib/core/auth/permissions";
import {
  academicYearInputSchema,
  admissionDocumentTypeInputSchema,
  admissionStageInputSchema,
  classInputSchema,
  gradeBandInputSchema,
  holidayInputSchema,
  hpcCriterionInputSchema,
  hpcRatingScaleInputSchema,
  namedEntityInputSchema,
  periodInputSchema,
  sectionInputSchema,
  studentCategoryInputSchema,
  subjectInputSchema,
} from "./schemas";

export interface MasterDataFormState {
  error?: string;
}

const PAGE_PATH = "/settings/master-data";
const PERMISSION = "school.manage_master_data";

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

async function writeAuditLog(schoolId: string, actorAuthUserId: string, action: string, entityId: string | null): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.from("audit_log").insert({
    school_id: schoolId,
    actor_auth_user_id: actorAuthUserId,
    action,
    entity_type: "master_data",
    entity_id: entityId,
    metadata: {},
  });
}

/** Every master-data table here is (school_id, id, ...) -- one delete path, not eight duplicated ones. */
type MasterDataTable =
  | "academic_year"
  | "class"
  | "section"
  | "subject"
  | "department"
  | "designation"
  | "house"
  | "student_category"
  | "holiday"
  | "grade_band"
  | "admission_stage"
  | "admission_document_type"
  | "period"
  | "hpc_criterion"
  | "hpc_rating_scale";

async function deleteRow(table: MasterDataTable, id: string, action: string): Promise<MasterDataFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from(table).delete().eq("id", id).eq("school_id", session.schoolId);
  if (error) {
    if (error.code === "23503") return { error: "Cannot delete -- this is already in use by other records." };
    return { error: error.message };
  }

  await writeAuditLog(session.schoolId, session.authUserId, action, id);
  revalidatePath(PAGE_PATH);
  return {};
}

// ---------------------------------------------------------------------------
// Academic year
// ---------------------------------------------------------------------------

export async function createAcademicYearAction(_prevState: MasterDataFormState, formData: FormData): Promise<MasterDataFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const parsed = academicYearInputSchema.safeParse({
    name: readField(formData, "name"),
    startDate: readField(formData, "startDate"),
    endDate: readField(formData, "endDate"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("academic_year")
    .insert({ school_id: session.schoolId, name: parsed.data.name, start_date: parsed.data.startDate, end_date: parsed.data.endDate })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not create academic year." };

  await writeAuditLog(session.schoolId, session.authUserId, "master_data.academic_year.created", data.id);
  revalidatePath(PAGE_PATH);
  return {};
}

export async function setCurrentAcademicYearAction(
  id: string,
  _prevState: MasterDataFormState,
  _formData: FormData,
): Promise<MasterDataFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const supabase = await createSupabaseServerClient();
  // Unset the old current year first -- the partial unique index only allows one is_current=true
  // row per school, so setting the new one first would collide with the still-current old one.
  const { error: unsetError } = await supabase
    .from("academic_year")
    .update({ is_current: false })
    .eq("school_id", session.schoolId)
    .eq("is_current", true);
  if (unsetError) return { error: unsetError.message };

  const { error: setError } = await supabase
    .from("academic_year")
    .update({ is_current: true })
    .eq("id", id)
    .eq("school_id", session.schoolId);
  if (setError) return { error: setError.message };

  await writeAuditLog(session.schoolId, session.authUserId, "master_data.academic_year.set_current", id);
  revalidatePath(PAGE_PATH);
  return {};
}

export async function updateAcademicYearAction(
  id: string,
  _prevState: MasterDataFormState,
  formData: FormData,
): Promise<MasterDataFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const parsed = academicYearInputSchema.safeParse({
    name: readField(formData, "name"),
    startDate: readField(formData, "startDate"),
    endDate: readField(formData, "endDate"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("academic_year")
    .update({ name: parsed.data.name, start_date: parsed.data.startDate, end_date: parsed.data.endDate })
    .eq("id", id)
    .eq("school_id", session.schoolId);
  if (error) return { error: error.message };

  await writeAuditLog(session.schoolId, session.authUserId, "master_data.academic_year.updated", id);
  revalidatePath(PAGE_PATH);
  return {};
}

export async function deleteAcademicYearAction(
  id: string,
  _prevState: MasterDataFormState,
  _formData: FormData,
): Promise<MasterDataFormState> {
  return deleteRow("academic_year", id, "master_data.academic_year.deleted");
}

// ---------------------------------------------------------------------------
// Classes
// ---------------------------------------------------------------------------

export async function createClassAction(_prevState: MasterDataFormState, formData: FormData): Promise<MasterDataFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const parsed = classInputSchema.safeParse({ name: readField(formData, "name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("class")
    .select("sort_order")
    .eq("school_id", session.schoolId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSortOrder = ((existing as unknown as { sort_order: number } | null)?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("class")
    .insert({ school_id: session.schoolId, name: parsed.data.name, sort_order: nextSortOrder })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not create class." };

  await writeAuditLog(session.schoolId, session.authUserId, "master_data.class.created", data.id);
  revalidatePath(PAGE_PATH);
  return {};
}

export async function updateClassAction(id: string, _prevState: MasterDataFormState, formData: FormData): Promise<MasterDataFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const parsed = classInputSchema.safeParse({ name: readField(formData, "name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("class").update({ name: parsed.data.name }).eq("id", id).eq("school_id", session.schoolId);
  if (error) return { error: error.message };

  await writeAuditLog(session.schoolId, session.authUserId, "master_data.class.updated", id);
  revalidatePath(PAGE_PATH);
  return {};
}

export async function deleteClassAction(id: string, _prevState: MasterDataFormState, _formData: FormData): Promise<MasterDataFormState> {
  return deleteRow("class", id, "master_data.class.deleted");
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export async function createSectionAction(_prevState: MasterDataFormState, formData: FormData): Promise<MasterDataFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const parsed = sectionInputSchema.safeParse({
    classId: readField(formData, "classId"),
    name: readField(formData, "name"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("section")
    .insert({ school_id: session.schoolId, class_id: parsed.data.classId, name: parsed.data.name })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not create section." };

  await writeAuditLog(session.schoolId, session.authUserId, "master_data.section.created", data.id);
  revalidatePath(PAGE_PATH);
  return {};
}

export async function updateSectionAction(id: string, _prevState: MasterDataFormState, formData: FormData): Promise<MasterDataFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const parsed = namedEntityInputSchema.safeParse({ name: readField(formData, "name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("section").update({ name: parsed.data.name }).eq("id", id).eq("school_id", session.schoolId);
  if (error) return { error: error.message };

  await writeAuditLog(session.schoolId, session.authUserId, "master_data.section.updated", id);
  revalidatePath(PAGE_PATH);
  return {};
}

export async function deleteSectionAction(id: string, _prevState: MasterDataFormState, _formData: FormData): Promise<MasterDataFormState> {
  return deleteRow("section", id, "master_data.section.deleted");
}

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------

export async function createSubjectAction(_prevState: MasterDataFormState, formData: FormData): Promise<MasterDataFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const parsed = subjectInputSchema.safeParse({ name: readField(formData, "name"), code: readField(formData, "code") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("subject")
    .insert({ school_id: session.schoolId, name: parsed.data.name, code: parsed.data.code || null })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not create subject." };

  await writeAuditLog(session.schoolId, session.authUserId, "master_data.subject.created", data.id);
  revalidatePath(PAGE_PATH);
  return {};
}

export async function updateSubjectAction(id: string, _prevState: MasterDataFormState, formData: FormData): Promise<MasterDataFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const parsed = subjectInputSchema.safeParse({ name: readField(formData, "name"), code: readField(formData, "code") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("subject")
    .update({ name: parsed.data.name, code: parsed.data.code || null })
    .eq("id", id)
    .eq("school_id", session.schoolId);
  if (error) return { error: error.message };

  await writeAuditLog(session.schoolId, session.authUserId, "master_data.subject.updated", id);
  revalidatePath(PAGE_PATH);
  return {};
}

export async function deleteSubjectAction(id: string, _prevState: MasterDataFormState, _formData: FormData): Promise<MasterDataFormState> {
  return deleteRow("subject", id, "master_data.subject.deleted");
}

// ---------------------------------------------------------------------------
// Class-subject mapping -- a full replace per submit, not a diff. class_subject rows carry no
// data beyond the two foreign keys, so there's nothing a diff would preserve that a replace
// loses, and a replace is far simpler than reconciling a checkbox grid against existing rows.
// ---------------------------------------------------------------------------

export async function updateClassSubjectMappingAction(
  _prevState: MasterDataFormState,
  formData: FormData,
): Promise<MasterDataFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const supabase = await createSupabaseServerClient();
  const { data: classes, error: classesError } = await supabase.from("class").select("id").eq("school_id", session.schoolId);
  if (classesError) return { error: classesError.message };
  const classIds = (classes ?? []).map((c) => c.id);
  if (classIds.length === 0) return {};

  const pairs = formData
    .getAll("pair")
    .map((v) => String(v).split(":"))
    .filter((parts): parts is [string, string] => parts.length === 2);

  const { error: deleteError } = await supabase.from("class_subject").delete().in("class_id", classIds);
  if (deleteError) return { error: deleteError.message };

  if (pairs.length > 0) {
    const rows = pairs.map(([classId, subjectId]) => ({ class_id: classId, subject_id: subjectId }));
    const { error: insertError } = await supabase.from("class_subject").insert(rows);
    if (insertError) return { error: insertError.message };
  }

  await writeAuditLog(session.schoolId, session.authUserId, "master_data.class_subject.updated", null);
  revalidatePath(PAGE_PATH);
  return {};
}

// ---------------------------------------------------------------------------
// Departments, designations, houses -- identical (school_id, name) shape.
// ---------------------------------------------------------------------------

async function createNamedRow(
  table: "department" | "designation" | "house",
  action: string,
  formData: FormData,
): Promise<MasterDataFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const parsed = namedEntityInputSchema.safeParse({ name: readField(formData, "name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from(table).insert({ school_id: session.schoolId, name: parsed.data.name }).select("id").single();
  if (error || !data) return { error: error?.message ?? `Could not create ${table}.` };

  await writeAuditLog(session.schoolId, session.authUserId, action, data.id);
  revalidatePath(PAGE_PATH);
  return {};
}

async function updateNamedRow(
  table: "department" | "designation" | "house",
  id: string,
  action: string,
  formData: FormData,
): Promise<MasterDataFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const parsed = namedEntityInputSchema.safeParse({ name: readField(formData, "name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from(table).update({ name: parsed.data.name }).eq("id", id).eq("school_id", session.schoolId);
  if (error) return { error: error.message };

  await writeAuditLog(session.schoolId, session.authUserId, action, id);
  revalidatePath(PAGE_PATH);
  return {};
}

export async function createDepartmentAction(_prevState: MasterDataFormState, formData: FormData): Promise<MasterDataFormState> {
  return createNamedRow("department", "master_data.department.created", formData);
}
export async function updateDepartmentAction(id: string, _prevState: MasterDataFormState, formData: FormData): Promise<MasterDataFormState> {
  return updateNamedRow("department", id, "master_data.department.updated", formData);
}
export async function deleteDepartmentAction(id: string, _prevState: MasterDataFormState, _formData: FormData): Promise<MasterDataFormState> {
  return deleteRow("department", id, "master_data.department.deleted");
}

export async function createDesignationAction(_prevState: MasterDataFormState, formData: FormData): Promise<MasterDataFormState> {
  return createNamedRow("designation", "master_data.designation.created", formData);
}
export async function updateDesignationAction(id: string, _prevState: MasterDataFormState, formData: FormData): Promise<MasterDataFormState> {
  return updateNamedRow("designation", id, "master_data.designation.updated", formData);
}
export async function deleteDesignationAction(id: string, _prevState: MasterDataFormState, _formData: FormData): Promise<MasterDataFormState> {
  return deleteRow("designation", id, "master_data.designation.deleted");
}

export async function createHouseAction(_prevState: MasterDataFormState, formData: FormData): Promise<MasterDataFormState> {
  return createNamedRow("house", "master_data.house.created", formData);
}
export async function updateHouseAction(id: string, _prevState: MasterDataFormState, formData: FormData): Promise<MasterDataFormState> {
  return updateNamedRow("house", id, "master_data.house.updated", formData);
}
export async function deleteHouseAction(id: string, _prevState: MasterDataFormState, _formData: FormData): Promise<MasterDataFormState> {
  return deleteRow("house", id, "master_data.house.deleted");
}

// ---------------------------------------------------------------------------
// Student categories
// ---------------------------------------------------------------------------

export async function createStudentCategoryAction(_prevState: MasterDataFormState, formData: FormData): Promise<MasterDataFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const parsed = studentCategoryInputSchema.safeParse({
    key: readField(formData, "key"),
    label: readField(formData, "label"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("student_category")
    .insert({ school_id: session.schoolId, key: parsed.data.key, label: parsed.data.label })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not create category." };

  await writeAuditLog(session.schoolId, session.authUserId, "master_data.student_category.created", data.id);
  revalidatePath(PAGE_PATH);
  return {};
}

export async function updateStudentCategoryAction(
  id: string,
  _prevState: MasterDataFormState,
  formData: FormData,
): Promise<MasterDataFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  // Label only -- key is the stable identifier other rows/imports reference (e.g. a category_key
  // column on an import row), so it's intentionally not editable here.
  const label = readField(formData, "label").trim();
  if (!label) return { error: "Label is required" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("student_category").update({ label }).eq("id", id).eq("school_id", session.schoolId);
  if (error) return { error: error.message };

  await writeAuditLog(session.schoolId, session.authUserId, "master_data.student_category.updated", id);
  revalidatePath(PAGE_PATH);
  return {};
}

export async function deleteStudentCategoryAction(
  id: string,
  _prevState: MasterDataFormState,
  _formData: FormData,
): Promise<MasterDataFormState> {
  return deleteRow("student_category", id, "master_data.student_category.deleted");
}

// ---------------------------------------------------------------------------
// Holidays -- see packages/db/supabase/migrations/20260904060000_holiday_calendar.sql for why
// this exists now (a P0 spec item Attendance, P1, turned out to actually depend on).
// ---------------------------------------------------------------------------

export async function createHolidayAction(_prevState: MasterDataFormState, formData: FormData): Promise<MasterDataFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const parsed = holidayInputSchema.safeParse({ date: readField(formData, "date"), name: readField(formData, "name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("holiday")
    .insert({ school_id: session.schoolId, date: parsed.data.date, name: parsed.data.name })
    .select("id")
    .single();
  if (error || !data) {
    if (error?.code === "23505") return { error: "A holiday is already recorded on that date." };
    return { error: error?.message ?? "Could not create holiday." };
  }

  await writeAuditLog(session.schoolId, session.authUserId, "master_data.holiday.created", data.id);
  revalidatePath(PAGE_PATH);
  return {};
}

// Name only -- date is the identifying field (the unique constraint and the marking-screen
// lookup are keyed on it); correcting a wrong date means delete-and-recreate, same trade-off
// student_category's key/label split makes for its own stable identifier.
export async function updateHolidayAction(id: string, _prevState: MasterDataFormState, formData: FormData): Promise<MasterDataFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const name = readField(formData, "name").trim();
  if (!name) return { error: "Name is required" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("holiday").update({ name }).eq("id", id).eq("school_id", session.schoolId);
  if (error) return { error: error.message };

  await writeAuditLog(session.schoolId, session.authUserId, "master_data.holiday.updated", id);
  revalidatePath(PAGE_PATH);
  return {};
}

export async function deleteHolidayAction(id: string, _prevState: MasterDataFormState, _formData: FormData): Promise<MasterDataFormState> {
  return deleteRow("holiday", id, "master_data.holiday.deleted");
}

// ---------------------------------------------------------------------------
// Grade bands -- Exams' prerequisite (fn_resolve_grade maps a percentage onto one of these).
// Add-and-delete only, like Holidays: correcting a wrong band is delete-and-recreate rather than
// an inline edit, since getting a band boundary wrong is rare and the whole row (four fields) is
// the natural unit of correction, not one field at a time.
// ---------------------------------------------------------------------------

export async function createGradeBandAction(_prevState: MasterDataFormState, formData: FormData): Promise<MasterDataFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const parsed = gradeBandInputSchema.safeParse({
    minPercentage: readField(formData, "minPercentage"),
    maxPercentage: readField(formData, "maxPercentage"),
    gradeLabel: readField(formData, "gradeLabel"),
    gradePoint: readField(formData, "gradePoint") || undefined,
    remark: readField(formData, "remark") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("grade_band")
    .insert({
      school_id: session.schoolId,
      min_percentage: parsed.data.minPercentage,
      max_percentage: parsed.data.maxPercentage,
      grade_label: parsed.data.gradeLabel,
      grade_point: parsed.data.gradePoint ?? null,
      remark: parsed.data.remark ?? null,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not create grade band." };

  await writeAuditLog(session.schoolId, session.authUserId, "master_data.grade_band.created", data.id);
  revalidatePath(PAGE_PATH);
  return {};
}

export async function deleteGradeBandAction(id: string, _prevState: MasterDataFormState, _formData: FormData): Promise<MasterDataFormState> {
  return deleteRow("grade_band", id, "master_data.grade_band.deleted");
}

// ---------------------------------------------------------------------------
// Admissions (P2, §C) -- configurable pipeline stages and document-checklist types. `stageType`
// / `isRequired` are extra fields namedEntityInputSchema doesn't carry, so these get their own
// create/update, same shape as student_category's above, not the bare-name helpers.
// ---------------------------------------------------------------------------

export async function createAdmissionStageAction(_prevState: MasterDataFormState, formData: FormData): Promise<MasterDataFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const parsed = admissionStageInputSchema.safeParse({
    name: readField(formData, "name"),
    stageType: readField(formData, "stageType") || "in_progress",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("admission_stage")
    .select("id", { count: "exact", head: true })
    .eq("school_id", session.schoolId);

  const { data, error } = await supabase
    .from("admission_stage")
    .insert({ school_id: session.schoolId, name: parsed.data.name, stage_type: parsed.data.stageType, sort_order: count ?? 0 })
    .select("id")
    .single();
  if (error || !data) {
    if (error?.code === "23505") return { error: "A stage with this name already exists." };
    return { error: error?.message ?? "Could not create stage." };
  }

  await writeAuditLog(session.schoolId, session.authUserId, "master_data.admission_stage.created", data.id);
  revalidatePath(PAGE_PATH);
  return {};
}

// Name only -- stageType is the stable identifier fn_confirm_admission looks up the 'admitted'
// stage by (see the migration's comment); changing it after creation is delete-and-recreate,
// same rule as student_category's key.
export async function updateAdmissionStageAction(
  id: string,
  _prevState: MasterDataFormState,
  formData: FormData,
): Promise<MasterDataFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const name = readField(formData, "name").trim();
  if (!name) return { error: "Name is required" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("admission_stage").update({ name }).eq("id", id).eq("school_id", session.schoolId);
  if (error) return { error: error.message };

  await writeAuditLog(session.schoolId, session.authUserId, "master_data.admission_stage.updated", id);
  revalidatePath(PAGE_PATH);
  return {};
}

export async function deleteAdmissionStageAction(
  id: string,
  _prevState: MasterDataFormState,
  _formData: FormData,
): Promise<MasterDataFormState> {
  return deleteRow("admission_stage", id, "master_data.admission_stage.deleted");
}

export async function createAdmissionDocumentTypeAction(
  _prevState: MasterDataFormState,
  formData: FormData,
): Promise<MasterDataFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const parsed = admissionDocumentTypeInputSchema.safeParse({
    name: readField(formData, "name"),
    isRequired: formData.get("isRequired") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("admission_document_type")
    .select("id", { count: "exact", head: true })
    .eq("school_id", session.schoolId);

  const { data, error } = await supabase
    .from("admission_document_type")
    .insert({ school_id: session.schoolId, name: parsed.data.name, is_required: parsed.data.isRequired, sort_order: count ?? 0 })
    .select("id")
    .single();
  if (error || !data) {
    if (error?.code === "23505") return { error: "A document type with this name already exists." };
    return { error: error?.message ?? "Could not create document type." };
  }

  await writeAuditLog(session.schoolId, session.authUserId, "master_data.admission_document_type.created", data.id);
  revalidatePath(PAGE_PATH);
  return {};
}

// Name only -- same reasoning as updateAdmissionStageAction above; change is_required by
// delete-and-recreate.
export async function updateAdmissionDocumentTypeAction(
  id: string,
  _prevState: MasterDataFormState,
  formData: FormData,
): Promise<MasterDataFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const name = readField(formData, "name").trim();
  if (!name) return { error: "Name is required" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("admission_document_type").update({ name }).eq("id", id).eq("school_id", session.schoolId);
  if (error) return { error: error.message };

  await writeAuditLog(session.schoolId, session.authUserId, "master_data.admission_document_type.updated", id);
  revalidatePath(PAGE_PATH);
  return {};
}

export async function deleteAdmissionDocumentTypeAction(
  id: string,
  _prevState: MasterDataFormState,
  _formData: FormData,
): Promise<MasterDataFormState> {
  return deleteRow("admission_document_type", id, "master_data.admission_document_type.deleted");
}

// ---------------------------------------------------------------------------
// Timetable (P2, §I) -- period timings. Add-and-delete only, like Holidays/Grade bands: a period
// has four fields (number/label/start/end/is_break) that all change together when a school
// revises its bell schedule -- delete-and-recreate is the natural unit of correction, not an
// inline single-field edit.
// ---------------------------------------------------------------------------

export async function createPeriodAction(_prevState: MasterDataFormState, formData: FormData): Promise<MasterDataFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const parsed = periodInputSchema.safeParse({
    periodNumber: readField(formData, "periodNumber"),
    label: readField(formData, "label"),
    startTime: readField(formData, "startTime"),
    endTime: readField(formData, "endTime"),
    isBreak: formData.get("isBreak") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("period")
    .insert({
      school_id: session.schoolId,
      period_number: parsed.data.periodNumber,
      label: parsed.data.label,
      start_time: parsed.data.startTime,
      end_time: parsed.data.endTime,
      is_break: parsed.data.isBreak,
    })
    .select("id")
    .single();
  if (error || !data) {
    if (error?.code === "23505") return { error: "A period with this number already exists." };
    return { error: error?.message ?? "Could not create period." };
  }

  await writeAuditLog(session.schoolId, session.authUserId, "master_data.period.created", data.id);
  revalidatePath(PAGE_PATH);
  return {};
}

export async function deletePeriodAction(id: string, _prevState: MasterDataFormState, _formData: FormData): Promise<MasterDataFormState> {
  return deleteRow("period", id, "master_data.period.deleted");
}

// ---------------------------------------------------------------------------
// Holistic Progress Card (P2, §H) -- co-curricular/life-skill criteria to rate, and the
// qualitative rating scale (A/Excellent .. D/Needs Improvement) used to rate them. Add-and-delete
// only, same reasoning as Holidays/Grade bands/Period: renaming a criterion or rescaling a grade
// scheme is rare enough that delete-and-recreate is the natural correction, not an inline edit.
// Sort order auto-increments per (school, category) for criteria and per school for the scale,
// same counting approach as admission_stage/admission_document_type.
// ---------------------------------------------------------------------------

export async function createHpcCriterionAction(_prevState: MasterDataFormState, formData: FormData): Promise<MasterDataFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const parsed = hpcCriterionInputSchema.safeParse({
    category: readField(formData, "category") || "co_curricular",
    name: readField(formData, "name"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("hpc_criterion")
    .select("id", { count: "exact", head: true })
    .eq("school_id", session.schoolId)
    .eq("category", parsed.data.category);

  const { data, error } = await supabase
    .from("hpc_criterion")
    .insert({ school_id: session.schoolId, category: parsed.data.category, name: parsed.data.name, sort_order: count ?? 0 })
    .select("id")
    .single();
  if (error || !data) {
    if (error?.code === "23505") return { error: "A criterion with this name already exists in this category." };
    return { error: error?.message ?? "Could not create criterion." };
  }

  await writeAuditLog(session.schoolId, session.authUserId, "master_data.hpc_criterion.created", data.id);
  revalidatePath(PAGE_PATH);
  return {};
}

export async function deleteHpcCriterionAction(id: string, _prevState: MasterDataFormState, _formData: FormData): Promise<MasterDataFormState> {
  return deleteRow("hpc_criterion", id, "master_data.hpc_criterion.deleted");
}

export async function createHpcRatingScaleAction(_prevState: MasterDataFormState, formData: FormData): Promise<MasterDataFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const parsed = hpcRatingScaleInputSchema.safeParse({
    code: readField(formData, "code"),
    label: readField(formData, "label"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { count } = await supabase.from("hpc_rating_scale").select("id", { count: "exact", head: true }).eq("school_id", session.schoolId);

  const { data, error } = await supabase
    .from("hpc_rating_scale")
    .insert({ school_id: session.schoolId, code: parsed.data.code, label: parsed.data.label, sort_order: count ?? 0 })
    .select("id")
    .single();
  if (error || !data) {
    if (error?.code === "23505") return { error: "A rating with this code already exists." };
    return { error: error?.message ?? "Could not create rating." };
  }

  await writeAuditLog(session.schoolId, session.authUserId, "master_data.hpc_rating_scale.created", data.id);
  revalidatePath(PAGE_PATH);
  return {};
}

export async function deleteHpcRatingScaleAction(id: string, _prevState: MasterDataFormState, _formData: FormData): Promise<MasterDataFormState> {
  return deleteRow("hpc_rating_scale", id, "master_data.hpc_rating_scale.deleted");
}
