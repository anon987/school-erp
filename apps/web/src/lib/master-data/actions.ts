"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import { getSession } from "@/lib/core/auth/session";
import { requirePermission } from "@/lib/core/auth/permissions";
import {
  academicYearInputSchema,
  classInputSchema,
  namedEntityInputSchema,
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
type MasterDataTable = "academic_year" | "class" | "section" | "subject" | "department" | "designation" | "house" | "student_category";

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

export async function createDepartmentAction(_prevState: MasterDataFormState, formData: FormData): Promise<MasterDataFormState> {
  return createNamedRow("department", "master_data.department.created", formData);
}
export async function deleteDepartmentAction(id: string, _prevState: MasterDataFormState, _formData: FormData): Promise<MasterDataFormState> {
  return deleteRow("department", id, "master_data.department.deleted");
}

export async function createDesignationAction(_prevState: MasterDataFormState, formData: FormData): Promise<MasterDataFormState> {
  return createNamedRow("designation", "master_data.designation.created", formData);
}
export async function deleteDesignationAction(id: string, _prevState: MasterDataFormState, _formData: FormData): Promise<MasterDataFormState> {
  return deleteRow("designation", id, "master_data.designation.deleted");
}

export async function createHouseAction(_prevState: MasterDataFormState, formData: FormData): Promise<MasterDataFormState> {
  return createNamedRow("house", "master_data.house.created", formData);
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

export async function deleteStudentCategoryAction(
  id: string,
  _prevState: MasterDataFormState,
  _formData: FormData,
): Promise<MasterDataFormState> {
  return deleteRow("student_category", id, "master_data.student_category.deleted");
}
