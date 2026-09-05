import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import type { StaffClassSubjectOption, StaffOption, SubstitutionRow, TeacherTimetableSlotRow, TimetableSlotRow } from "./types";

/** Every active staff member, for the substitute-teacher picker -- bounded (a school's whole staff list, not a paginated directory) same as lib/members' getAssignableRoles. */
export async function getAllStaffOptions(schoolId: string): Promise<StaffOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("staff")
    .select("id, first_name, last_name")
    .eq("school_id", schoolId)
    .eq("employment_status", "active")
    .order("first_name");
  if (error) throw error;
  return ((data ?? []) as unknown as { id: string; first_name: string; last_name: string }[]).map((s) => ({ id: s.id, name: `${s.first_name} ${s.last_name}` }));
}

export async function getStaffClassSubjectOptions(
  schoolId: string,
  academicYearId: string,
  classId: string,
  sectionId: string,
): Promise<StaffClassSubjectOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("staff_class_subject")
    .select("id, subject:subject_id(id, name), staff:staff_id(id, first_name, last_name)")
    .eq("school_id", schoolId)
    .eq("academic_year_id", academicYearId)
    .eq("class_id", classId)
    .eq("section_id", sectionId);
  if (error) throw error;

  return (
    (data ?? []) as unknown as {
      id: string;
      subject: { id: string; name: string } | null;
      staff: { id: string; first_name: string; last_name: string } | null;
    }[]
  )
    .filter((r) => r.subject && r.staff)
    .map((r) => ({
      id: r.id,
      subjectId: r.subject!.id,
      subjectName: r.subject!.name,
      staffId: r.staff!.id,
      staffName: `${r.staff!.first_name} ${r.staff!.last_name}`,
    }));
}

export async function getTimetableGrid(schoolId: string, classId: string, sectionId: string): Promise<TimetableSlotRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("timetable_slot")
    .select("id, day_of_week, period_id, room, staff_class_subject_id, class_id, section_id, subject:subject_id(name), staff:staff_id(first_name, last_name)")
    .eq("school_id", schoolId)
    .eq("class_id", classId)
    .eq("section_id", sectionId);
  if (error) throw error;

  return (
    (data ?? []) as unknown as {
      id: string;
      day_of_week: number;
      period_id: string;
      room: string | null;
      staff_class_subject_id: string;
      class_id: string;
      section_id: string;
      subject: { name: string } | null;
      staff: { first_name: string; last_name: string } | null;
    }[]
  ).map((r) => ({
    id: r.id,
    dayOfWeek: r.day_of_week,
    periodId: r.period_id,
    room: r.room,
    staffClassSubjectId: r.staff_class_subject_id,
    subjectName: r.subject?.name ?? "",
    staffName: r.staff ? `${r.staff.first_name} ${r.staff.last_name}` : "",
    classId: r.class_id,
    sectionId: r.section_id,
  }));
}

/** A teacher's own weekly schedule across every class/section they teach -- used by the "My timetable" view. */
export async function getTeacherTimetable(schoolId: string, staffId: string): Promise<TeacherTimetableSlotRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("timetable_slot")
    .select(
      "id, day_of_week, period_id, room, staff_class_subject_id, class_id, section_id, subject:subject_id(name), staff:staff_id(first_name, last_name), class:class_id(name), section:section_id(name)",
    )
    .eq("school_id", schoolId)
    .eq("staff_id", staffId);
  if (error) throw error;

  return (
    (data ?? []) as unknown as {
      id: string;
      day_of_week: number;
      period_id: string;
      room: string | null;
      staff_class_subject_id: string;
      class_id: string;
      section_id: string;
      subject: { name: string } | null;
      staff: { first_name: string; last_name: string } | null;
      class: { name: string } | null;
      section: { name: string } | null;
    }[]
  ).map((r) => ({
    id: r.id,
    dayOfWeek: r.day_of_week,
    periodId: r.period_id,
    room: r.room,
    staffClassSubjectId: r.staff_class_subject_id,
    subjectName: r.subject?.name ?? "",
    staffName: r.staff ? `${r.staff.first_name} ${r.staff.last_name}` : "",
    classId: r.class_id,
    sectionId: r.section_id,
    className: r.class?.name ?? "",
    sectionName: r.section?.name ?? "",
  }));
}

export async function getSubstitutionsForSlots(schoolId: string, timetableSlotIds: string[], onDate: string): Promise<SubstitutionRow[]> {
  if (timetableSlotIds.length === 0) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("substitution")
    .select("id, timetable_slot_id, substitution_date, reason, original:original_staff_id(first_name, last_name), substitute:substitute_staff_id(id, first_name, last_name)")
    .eq("school_id", schoolId)
    .eq("substitution_date", onDate)
    .in("timetable_slot_id", timetableSlotIds);
  if (error) throw error;

  return (
    (data ?? []) as unknown as {
      id: string;
      timetable_slot_id: string;
      substitution_date: string;
      reason: string | null;
      original: { first_name: string; last_name: string } | null;
      substitute: { id: string; first_name: string; last_name: string } | null;
    }[]
  ).map((r) => ({
    id: r.id,
    timetableSlotId: r.timetable_slot_id,
    substitutionDate: r.substitution_date,
    originalStaffName: r.original ? `${r.original.first_name} ${r.original.last_name}` : "",
    substituteStaffId: r.substitute?.id ?? "",
    substituteStaffName: r.substitute ? `${r.substitute.first_name} ${r.substitute.last_name}` : "",
    reason: r.reason,
  }));
}
