"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import { getSession } from "@/lib/core/auth/session";
import { requirePermission } from "@/lib/core/auth/permissions";
import { staffInputSchema, updateStaffInputSchema, qualificationInputSchema, staffAssignmentInputSchema, leaveTypeInputSchema, leaveRequestInputSchema } from "./schemas";

export interface StaffFormState {
  error?: string;
}

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function parseStaffFormData(formData: FormData) {
  return {
    employeeCode: readField(formData, "employeeCode"),
    firstName: readField(formData, "firstName"),
    lastName: readField(formData, "lastName"),
    dob: readField(formData, "dob"),
    gender: readField(formData, "gender"),
    phone: readField(formData, "phone"),
    email: readField(formData, "email"),
    joiningDate: readField(formData, "joiningDate"),
    employmentStatus: readField(formData, "employmentStatus") || "active",
    departmentId: readField(formData, "departmentId"),
    designationId: readField(formData, "designationId"),
  };
}

export async function createStaffAction(_prevState: StaffFormState, formData: FormData): Promise<StaffFormState> {
  await requirePermission("school.manage_staff");
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const raw = parseStaffFormData(formData);
  const parsed = staffInputSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();

  let employeeCode = parsed.data.employeeCode?.trim() || "";
  if (!employeeCode) {
    const { data, error } = await supabase.rpc("fn_next_school_number", {
      p_school_id: session.schoolId,
      p_sequence_key: "staff_employee_code",
    });
    if (error) return { error: error.message };
    employeeCode = data as unknown as string;
  }

  const { data: staff, error: insertError } = await supabase
    .from("staff")
    .insert({
      school_id: session.schoolId,
      employee_code: employeeCode,
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      dob: parsed.data.dob || null,
      gender: parsed.data.gender || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      joining_date: parsed.data.joiningDate,
      employment_status: parsed.data.employmentStatus,
      department_id: parsed.data.departmentId || null,
      designation_id: parsed.data.designationId || null,
    })
    .select("id")
    .single();
  if (insertError || !staff) return { error: insertError?.message ?? "Could not create staff record." };

  const staffId = (staff as unknown as { id: string }).id;

  await supabase.from("audit_log").insert({
    school_id: session.schoolId,
    actor_auth_user_id: session.authUserId,
    action: "staff.created",
    entity_type: "staff",
    entity_id: staffId,
    metadata: { employee_code: employeeCode },
  });

  revalidatePath("/people/staff");
  redirect(`/people/staff/${staffId}`);
}

export async function updateStaffAction(_prevState: StaffFormState, formData: FormData): Promise<StaffFormState> {
  await requirePermission("school.manage_staff");
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const staffId = readField(formData, "id");
  const raw = { ...parseStaffFormData(formData), id: staffId };
  const parsed = updateStaffInputSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();

  // "Service history" (docs/schoolerp_features.md §D) is audit_log, not a parallel history
  // table -- see the staff migration's comment. Capture the before-values for exactly the
  // fields that constitute a career change (department/designation), so the audit trail is
  // meaningful without a bespoke history schema.
  const { data: before } = await supabase
    .from("staff")
    .select("department_id, designation_id")
    .eq("id", parsed.data.id)
    .maybeSingle();
  const beforeRow = before as unknown as { department_id: string | null; designation_id: string | null } | null;

  const { error: updateError } = await supabase
    .from("staff")
    .update({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      dob: parsed.data.dob || null,
      gender: parsed.data.gender || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      joining_date: parsed.data.joiningDate,
      employment_status: parsed.data.employmentStatus,
      department_id: parsed.data.departmentId || null,
      designation_id: parsed.data.designationId || null,
    })
    .eq("id", parsed.data.id)
    .eq("school_id", session.schoolId);
  if (updateError) return { error: updateError.message };

  const departmentChanged = beforeRow && beforeRow.department_id !== (parsed.data.departmentId || null);
  const designationChanged = beforeRow && beforeRow.designation_id !== (parsed.data.designationId || null);

  if (departmentChanged || designationChanged) {
    await supabase.from("audit_log").insert({
      school_id: session.schoolId,
      actor_auth_user_id: session.authUserId,
      action: "staff.department_or_designation_changed",
      entity_type: "staff",
      entity_id: parsed.data.id,
      metadata: {
        department_id: { before: beforeRow?.department_id ?? null, after: parsed.data.departmentId || null },
        designation_id: { before: beforeRow?.designation_id ?? null, after: parsed.data.designationId || null },
      },
    });
  }

  revalidatePath(`/people/staff/${parsed.data.id}`);
  redirect(`/people/staff/${parsed.data.id}`);
}

export interface QualificationFormState {
  error?: string;
}

export async function addQualificationAction(
  _prevState: QualificationFormState,
  formData: FormData,
): Promise<QualificationFormState> {
  await requirePermission("school.manage_staff");
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const raw = {
    staffId: readField(formData, "staffId"),
    degree: readField(formData, "degree"),
    institution: readField(formData, "institution"),
    yearCompleted: readField(formData, "yearCompleted"),
  };
  const parsed = qualificationInputSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("staff_qualification").insert({
    school_id: session.schoolId,
    staff_id: parsed.data.staffId,
    degree: parsed.data.degree,
    institution: parsed.data.institution || null,
    year_completed: parsed.data.yearCompleted ? Number(parsed.data.yearCompleted) : null,
  });
  if (error) return { error: error.message };

  revalidatePath(`/people/staff/${parsed.data.staffId}`);
  return {};
}

export interface AssignmentFormState {
  error?: string;
}

export async function createStaffAssignmentAction(_prevState: AssignmentFormState, formData: FormData): Promise<AssignmentFormState> {
  await requirePermission("school.manage_staff");
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const parsed = staffAssignmentInputSchema.safeParse({
    staffId: readField(formData, "staffId"),
    academicYearId: readField(formData, "academicYearId"),
    classId: readField(formData, "classId"),
    sectionId: readField(formData, "sectionId"),
    subjectId: readField(formData, "subjectId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("staff_class_subject").insert({
    school_id: session.schoolId,
    staff_id: parsed.data.staffId,
    academic_year_id: parsed.data.academicYearId,
    class_id: parsed.data.classId,
    section_id: parsed.data.sectionId,
    subject_id: parsed.data.subjectId,
  });
  if (error) {
    if (error.code === "23505") return { error: "This class, section, and subject already has a teacher assigned this year -- remove that assignment first." };
    return { error: error.message };
  }

  await supabase.from("audit_log").insert({
    school_id: session.schoolId,
    actor_auth_user_id: session.authUserId,
    action: "staff.assignment_added",
    entity_type: "staff",
    entity_id: parsed.data.staffId,
    metadata: { classId: parsed.data.classId, sectionId: parsed.data.sectionId, subjectId: parsed.data.subjectId },
  });

  revalidatePath(`/people/staff/${parsed.data.staffId}`);
  return {};
}

export async function deleteStaffAssignmentAction(staffId: string, assignmentId: string, _prevState: AssignmentFormState, _formData: FormData): Promise<AssignmentFormState> {
  await requirePermission("school.manage_staff");
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("staff_class_subject").delete().eq("id", assignmentId).eq("school_id", session.schoolId);
  if (error) return { error: error.message };

  await supabase.from("audit_log").insert({
    school_id: session.schoolId,
    actor_auth_user_id: session.authUserId,
    action: "staff.assignment_removed",
    entity_type: "staff",
    entity_id: staffId,
    metadata: { assignmentId },
  });

  revalidatePath(`/people/staff/${staffId}`);
  return {};
}

export interface LeaveTypeFormState {
  error?: string;
}

export async function createLeaveTypeAction(_prevState: LeaveTypeFormState, formData: FormData): Promise<LeaveTypeFormState> {
  await requirePermission("school.manage_staff");
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const parsed = leaveTypeInputSchema.safeParse({ name: readField(formData, "name"), isPaid: formData.get("isPaid") === "on" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("leave_type").insert({ school_id: session.schoolId, name: parsed.data.name, is_paid: parsed.data.isPaid });
  if (error) {
    if (error.code === "23505") return { error: "A leave type with this name already exists." };
    return { error: error.message };
  }

  revalidatePath("/people/staff");
  return {};
}

export async function deleteLeaveTypeAction(id: string, _prevState: LeaveTypeFormState, _formData: FormData): Promise<LeaveTypeFormState> {
  await requirePermission("school.manage_staff");
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("leave_type").delete().eq("id", id).eq("school_id", session.schoolId);
  if (error) return { error: "Can't delete a leave type that already has leave records against it." };

  revalidatePath("/people/staff");
  return {};
}

export interface LeaveRequestFormState {
  error?: string;
}

/**
 * Logging a leave IS approving it -- whoever holds school.manage_staff and enters this record is
 * the authority for it, the same "the person entering it has the authority" pattern marks entry
 * and fines already use elsewhere in this app. There is no separate pending-then-approve queue in
 * this pass (no self-service staff portal exists yet to submit a pending request from).
 */
export async function createLeaveRequestAction(_prevState: LeaveRequestFormState, formData: FormData): Promise<LeaveRequestFormState> {
  await requirePermission("school.manage_staff");
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const parsed = leaveRequestInputSchema.safeParse({
    staffId: readField(formData, "staffId"),
    leaveTypeId: readField(formData, "leaveTypeId"),
    startDate: readField(formData, "startDate"),
    endDate: readField(formData, "endDate"),
    reason: readField(formData, "reason") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("leave_request").insert({
    school_id: session.schoolId,
    staff_id: parsed.data.staffId,
    leave_type_id: parsed.data.leaveTypeId,
    start_date: parsed.data.startDate,
    end_date: parsed.data.endDate,
    reason: parsed.data.reason || null,
    status: "approved",
    applied_by_auth_user_id: session.authUserId,
    decided_by_auth_user_id: session.authUserId,
    decided_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };

  await supabase.from("audit_log").insert({
    school_id: session.schoolId,
    actor_auth_user_id: session.authUserId,
    action: "staff.leave_logged",
    entity_type: "staff",
    entity_id: parsed.data.staffId,
    metadata: { leaveTypeId: parsed.data.leaveTypeId, startDate: parsed.data.startDate, endDate: parsed.data.endDate },
  });

  revalidatePath(`/people/staff/${parsed.data.staffId}`);
  return {};
}

export async function cancelLeaveRequestAction(staffId: string, leaveRequestId: string, _prevState: LeaveRequestFormState, _formData: FormData): Promise<LeaveRequestFormState> {
  await requirePermission("school.manage_staff");
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("leave_request").update({ status: "cancelled" }).eq("id", leaveRequestId).eq("school_id", session.schoolId);
  if (error) return { error: error.message };

  await supabase.from("audit_log").insert({
    school_id: session.schoolId,
    actor_auth_user_id: session.authUserId,
    action: "staff.leave_cancelled",
    entity_type: "staff",
    entity_id: staffId,
    metadata: { leaveRequestId },
  });

  revalidatePath(`/people/staff/${staffId}`);
  return {};
}
