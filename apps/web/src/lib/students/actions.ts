"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import { getAccessToken, getSession } from "@/lib/core/auth/session";
import { requirePermission } from "@/lib/core/auth/permissions";
import { workerEnv } from "@/lib/core/worker/env";
import { studentInputSchema, updateStudentInputSchema, type GuardianInput } from "./schemas";

export interface StudentFormState {
  error?: string;
}

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function parseStudentFormData(formData: FormData) {
  return {
    admissionNumber: readField(formData, "admissionNumber"),
    firstName: readField(formData, "firstName"),
    lastName: readField(formData, "lastName"),
    dob: readField(formData, "dob"),
    gender: readField(formData, "gender"),
    bloodGroup: readField(formData, "bloodGroup"),
    categoryId: readField(formData, "categoryId"),
    houseId: readField(formData, "houseId"),
    classId: readField(formData, "classId"),
    sectionId: readField(formData, "sectionId"),
    rollNumber: readField(formData, "rollNumber"),
    guardian1Name: readField(formData, "guardian1Name"),
    guardian1Relationship: readField(formData, "guardian1Relationship"),
    guardian1Phone: readField(formData, "guardian1Phone"),
    guardian1Email: readField(formData, "guardian1Email"),
    guardian2Name: readField(formData, "guardian2Name"),
    guardian2Relationship: readField(formData, "guardian2Relationship"),
    guardian2Phone: readField(formData, "guardian2Phone"),
    guardian2Email: readField(formData, "guardian2Email"),
  };
}

/**
 * Guardian upsert for the interactive form -- matched by SLOT (guardian1 = primary contact,
 * guardian2 = not), same rule as fn_commit_student_import_rows uses for import, for the same
 * reason: the slot is the stable identity across edits, not the phone number (which is often
 * exactly what's being corrected). This is a deliberately separate implementation from the SQL
 * import path, not a drifted duplicate of it -- a single-row interactive edit and a
 * multi-thousand-row bulk commit are different enough operations that sharing one code path
 * would mean exposing the whole PL/pgSQL transaction machinery over RPC for one row.
 */
async function upsertGuardianSlot(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  schoolId: string,
  studentId: string,
  isPrimary: boolean,
  input: GuardianInput | null,
): Promise<void> {
  if (!input || !input.firstName) return;

  const { data: existing } = await supabase
    .from("student_guardian")
    .select("guardian_id")
    .eq("student_id", studentId)
    .eq("is_primary_contact", isPrimary)
    .maybeSingle();

  const existingGuardianId = (existing as unknown as { guardian_id: string } | null)?.guardian_id ?? null;

  if (existingGuardianId) {
    await supabase.from("guardian").update({ first_name: input.firstName }).eq("id", existingGuardianId);
    await supabase
      .from("student_guardian")
      .update({
        relationship_type: input.relationshipType,
        phone: input.phone || null,
        email: input.email || null,
      })
      .eq("student_id", studentId)
      .eq("guardian_id", existingGuardianId);
    return;
  }

  const { data: guardian, error: guardianError } = await supabase
    .from("guardian")
    .insert({ school_id: schoolId, first_name: input.firstName })
    .select("id")
    .single();
  if (guardianError || !guardian) return;

  const guardianId = (guardian as unknown as { id: string }).id;
  await supabase.from("student_guardian").insert({
    student_id: studentId,
    guardian_id: guardianId,
    school_id: schoolId,
    relationship_type: input.relationshipType,
    phone: input.phone || null,
    email: input.email || null,
    is_primary_contact: isPrimary,
  });
}

function extractGuardianSlot(
  raw: ReturnType<typeof parseStudentFormData>,
  slot: 1 | 2,
): GuardianInput | null {
  const name = slot === 1 ? raw.guardian1Name : raw.guardian2Name;
  if (!name) return null;
  return {
    firstName: name,
    relationshipType:
      ((slot === 1 ? raw.guardian1Relationship : raw.guardian2Relationship) || "guardian") as GuardianInput["relationshipType"],
    phone: slot === 1 ? raw.guardian1Phone : raw.guardian2Phone,
    email: slot === 1 ? raw.guardian1Email : raw.guardian2Email,
  };
}

export async function createStudentAction(_prevState: StudentFormState, formData: FormData): Promise<StudentFormState> {
  await requirePermission("school.manage_students");
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const raw = parseStudentFormData(formData);
  const parsed = studentInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createSupabaseServerClient();

  let admissionNumber = parsed.data.admissionNumber?.trim() || "";
  if (!admissionNumber) {
    const { data, error } = await supabase.rpc("fn_next_school_number", {
      p_school_id: session.schoolId,
      p_sequence_key: "student_admission",
    });
    if (error) return { error: error.message };
    admissionNumber = data as unknown as string;
  }

  const { data: student, error: insertError } = await supabase
    .from("student")
    .insert({
      school_id: session.schoolId,
      admission_number: admissionNumber,
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      dob: parsed.data.dob || null,
      gender: parsed.data.gender || null,
      blood_group: parsed.data.bloodGroup || null,
      category_id: parsed.data.categoryId || null,
      house_id: parsed.data.houseId || null,
    })
    .select("id")
    .single();
  if (insertError || !student) return { error: insertError?.message ?? "Could not create student." };

  const studentId = (student as unknown as { id: string }).id;

  const { data: year } = await supabase
    .from("academic_year")
    .select("id")
    .eq("school_id", session.schoolId)
    .eq("is_current", true)
    .maybeSingle();
  const academicYearId = (year as unknown as { id: string } | null)?.id;

  if (academicYearId) {
    await supabase.from("enrollment").insert({
      school_id: session.schoolId,
      student_id: studentId,
      academic_year_id: academicYearId,
      class_id: parsed.data.classId,
      section_id: parsed.data.sectionId,
      roll_number: parsed.data.rollNumber || null,
    });
  }

  await upsertGuardianSlot(supabase, session.schoolId, studentId, true, extractGuardianSlot(raw, 1));
  await upsertGuardianSlot(supabase, session.schoolId, studentId, false, extractGuardianSlot(raw, 2));

  await supabase.from("audit_log").insert({
    school_id: session.schoolId,
    actor_auth_user_id: session.authUserId,
    action: "student.created",
    entity_type: "student",
    entity_id: studentId,
    metadata: { admission_number: admissionNumber },
  });

  revalidatePath("/people/students");
  redirect(`/people/students/${studentId}`);
}

export async function updateStudentAction(_prevState: StudentFormState, formData: FormData): Promise<StudentFormState> {
  await requirePermission("school.manage_students");
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const studentId = readField(formData, "id");
  const raw = { ...parseStudentFormData(formData), id: studentId };
  const parsed = updateStudentInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createSupabaseServerClient();

  const { error: updateError } = await supabase
    .from("student")
    .update({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      dob: parsed.data.dob || null,
      gender: parsed.data.gender || null,
      blood_group: parsed.data.bloodGroup || null,
      category_id: parsed.data.categoryId || null,
      house_id: parsed.data.houseId || null,
    })
    .eq("id", parsed.data.id)
    .eq("school_id", session.schoolId);
  if (updateError) return { error: updateError.message };

  const { data: year } = await supabase
    .from("academic_year")
    .select("id")
    .eq("school_id", session.schoolId)
    .eq("is_current", true)
    .maybeSingle();
  const academicYearId = (year as unknown as { id: string } | null)?.id;

  if (academicYearId) {
    await supabase
      .from("enrollment")
      .upsert(
        {
          school_id: session.schoolId,
          student_id: parsed.data.id,
          academic_year_id: academicYearId,
          class_id: parsed.data.classId,
          section_id: parsed.data.sectionId,
          roll_number: parsed.data.rollNumber || null,
        },
        { onConflict: "school_id,student_id,academic_year_id" },
      );
  }

  await upsertGuardianSlot(supabase, session.schoolId, parsed.data.id, true, extractGuardianSlot(raw, 1));
  await upsertGuardianSlot(supabase, session.schoolId, parsed.data.id, false, extractGuardianSlot(raw, 2));

  await supabase.from("audit_log").insert({
    school_id: session.schoolId,
    actor_auth_user_id: session.authUserId,
    action: "student.updated",
    entity_type: "student",
    entity_id: parsed.data.id,
    metadata: {},
  });

  revalidatePath(`/people/students/${parsed.data.id}`);
  redirect(`/people/students/${parsed.data.id}`);
}

export interface InviteGuardianState {
  error?: string;
  inviteLink?: string;
  status?: "invited" | "already_active" | "email_in_use";
}

/**
 * Per-guardian invite, not a bulk job -- see apps/worker/src/lib/createGuardianPortalAccount.ts's
 * header comment for why bulk-inviting all 2,200 already-imported guardians isn't built yet
 * (no automated send channel until Communication, P2, ships). This is the same worker endpoint
 * Admissions' confirm flow calls; here it's triggered on demand from a guardian's row on the
 * student profile page.
 */
export async function inviteGuardianToPortalAction(
  guardianId: string,
  email: string,
  _prevState: InviteGuardianState,
  _formData: FormData,
): Promise<InviteGuardianState> {
  await requirePermission("school.manage_admissions");

  const accessToken = await getAccessToken();
  if (!accessToken) return { error: "Your session has expired -- sign in again." };

  let response: Response;
  try {
    response = await fetch(`${workerEnv.WORKER_URL}/internal/guardians/${guardianId}/portal-account`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Internal-Secret": workerEnv.WORKER_INTERNAL_SECRET,
      },
      body: JSON.stringify({ email }),
    });
  } catch {
    return { error: "Could not reach the portal-account service. Try again in a moment." };
  }

  const body = (await response.json().catch(() => null)) as
    | { status?: InviteGuardianState["status"]; inviteLink?: string; error?: string }
    | null;
  if (!response.ok) return { error: body?.error ?? `Invite failed (${response.status}).` };

  return { ...(body?.status ? { status: body.status } : {}), ...(body?.inviteLink ? { inviteLink: body.inviteLink } : {}) };
}
