"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import { getSession } from "@/lib/core/auth/session";
import { requirePermission } from "@/lib/core/auth/permissions";
import { timetableSlotInputSchema, substitutionInputSchema } from "./schemas";

export interface TimetableFormState {
  error?: string;
}

const PERMISSION = "school.manage_timetable";

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/**
 * One cell of the weekly grid, auto-saved on change. An empty staffClassSubjectId clears the
 * slot (deletes the row); otherwise upserts. The denormalized columns (class_id/section_id/
 * academic_year_id/subject_id/staff_id) are resolved HERE from staff_class_subject_id, explicitly
 * -- not left to the DB trigger to fill from a placeholder, so the insert this action sends is
 * correct on its own; the trigger (packages/db) is a safety net for any other write path, not
 * the mechanism this action depends on.
 */
export async function upsertTimetableSlotAction(_prevState: TimetableFormState, formData: FormData): Promise<TimetableFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const parsed = timetableSlotInputSchema.safeParse({
    classId: readField(formData, "classId"),
    sectionId: readField(formData, "sectionId"),
    academicYearId: readField(formData, "academicYearId"),
    dayOfWeek: readField(formData, "dayOfWeek"),
    periodId: readField(formData, "periodId"),
    staffClassSubjectId: readField(formData, "staffClassSubjectId"),
    room: readField(formData, "room"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const input = parsed.data;

  const supabase = await createSupabaseServerClient();

  if (!input.staffClassSubjectId) {
    const { error } = await supabase
      .from("timetable_slot")
      .delete()
      .eq("school_id", session.schoolId)
      .eq("class_id", input.classId)
      .eq("section_id", input.sectionId)
      .eq("day_of_week", input.dayOfWeek)
      .eq("period_id", input.periodId);
    if (error) return { error: error.message };
    revalidatePath("/academics/timetable");
    return {};
  }

  const { data: scs, error: scsError } = await supabase
    .from("staff_class_subject")
    .select("academic_year_id, class_id, section_id, subject_id, staff_id")
    .eq("id", input.staffClassSubjectId)
    .eq("school_id", session.schoolId)
    .maybeSingle();
  if (scsError) return { error: scsError.message };
  if (!scs) return { error: "That teacher/subject assignment was not found." };
  const assignment = scs as unknown as { academic_year_id: string; class_id: string; section_id: string; subject_id: string; staff_id: string };

  const { error } = await supabase
    .from("timetable_slot")
    .upsert(
      {
        school_id: session.schoolId,
        staff_class_subject_id: input.staffClassSubjectId,
        day_of_week: input.dayOfWeek,
        period_id: input.periodId,
        room: input.room || null,
        academic_year_id: assignment.academic_year_id,
        class_id: assignment.class_id,
        section_id: assignment.section_id,
        subject_id: assignment.subject_id,
        staff_id: assignment.staff_id,
      },
      { onConflict: "school_id,class_id,section_id,day_of_week,period_id" },
    );
  if (error) {
    if (error.code === "23505") return { error: "This teacher (or room) is already booked for another class at this period." };
    return { error: error.message };
  }

  revalidatePath("/academics/timetable");
  return {};
}

export async function createSubstitutionAction(_prevState: TimetableFormState, formData: FormData): Promise<TimetableFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const parsed = substitutionInputSchema.safeParse({
    timetableSlotId: readField(formData, "timetableSlotId"),
    substitutionDate: readField(formData, "substitutionDate"),
    substituteStaffId: readField(formData, "substituteStaffId"),
    reason: readField(formData, "reason"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();

  const { data: slot, error: slotError } = await supabase
    .from("timetable_slot")
    .select("staff_id")
    .eq("id", parsed.data.timetableSlotId)
    .eq("school_id", session.schoolId)
    .maybeSingle();
  if (slotError) return { error: slotError.message };
  if (!slot) return { error: "Timetable slot not found." };

  const { error } = await supabase.from("substitution").insert({
    school_id: session.schoolId,
    timetable_slot_id: parsed.data.timetableSlotId,
    substitution_date: parsed.data.substitutionDate,
    original_staff_id: (slot as unknown as { staff_id: string }).staff_id,
    substitute_staff_id: parsed.data.substituteStaffId,
    reason: parsed.data.reason || null,
    created_by_auth_user_id: session.authUserId,
  });
  if (error) {
    if (error.code === "23505") return { error: "A substitution already exists for this slot on this date." };
    if (error.code === "23514") return { error: "The substitute can't be the same teacher who is already assigned this slot." };
    return { error: error.message };
  }

  revalidatePath("/academics/timetable");
  return {};
}

export async function deleteSubstitutionAction(id: string, _prevState: TimetableFormState, _formData: FormData): Promise<TimetableFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("substitution").delete().eq("id", id).eq("school_id", session.schoolId);
  if (error) return { error: error.message };

  revalidatePath("/academics/timetable");
  return {};
}
