import { supabase } from "../core/supabase/client";
import { getCurrentAcademicYearId } from "../core/school/getCurrentAcademicYear";
import { getCurrentStaffId } from "../core/auth/currentStaff";
import { hasPermission } from "../core/auth/permissions";
import { isSundayIso, todayIsoIst } from "../core/dateIst";
import { getCurrentPhotoUrls } from "../core/documents/queries";
import type { AttendanceStatus, MarkableSection, RosterStudentRow, SectionRosterResult, StudentAttendanceHistoryRow } from "./types";

async function getHolidayLabel(schoolId: string, date: string): Promise<string | null> {
  const { data } = await supabase.from("holiday").select("name").eq("school_id", schoolId).eq("date", date).maybeSingle();
  return (data as unknown as { name: string } | null)?.name ?? null;
}

/**
 * Port of apps/web/src/lib/attendance/queries.ts's getMarkableSections -- which sections the
 * signed-in teacher may pick from: every section for attendance.manage, or only the section(s)
 * they're class teacher of for attendance.mark_own_class. Takes `roles`/`authUserId`/`schoolId`
 * explicitly (from the caller's resolved StaffSession) since there's no server session to read.
 */
export async function getMarkableSections(schoolId: string, authUserId: string, roles: string[]): Promise<MarkableSection[]> {
  if (await hasPermission(roles, "attendance.manage")) {
    const { data, error } = await supabase.from("section").select("id, name, class:class_id(name, sort_order)").eq("school_id", schoolId);
    if (error) throw error;
    return ((data ?? []) as unknown as { id: string; name: string; class: { name: string; sort_order: number } | null }[])
      .sort((a, b) => (a.class?.sort_order ?? 0) - (b.class?.sort_order ?? 0) || a.name.localeCompare(b.name))
      .map((s) => ({ sectionId: s.id, className: s.class?.name ?? "", sectionName: s.name }));
  }

  if (!(await hasPermission(roles, "attendance.mark_own_class"))) return [];

  const staffId = await getCurrentStaffId(authUserId, schoolId);
  if (!staffId) return [];

  const { data, error } = await supabase
    .from("section")
    .select("id, name, class:class_id(name)")
    .eq("school_id", schoolId)
    .eq("class_teacher_staff_id", staffId);
  if (error) throw error;
  return ((data ?? []) as unknown as { id: string; name: string; class: { name: string } | null }[]).map((s) => ({
    sectionId: s.id,
    className: s.class?.name ?? "",
    sectionName: s.name,
  }));
}

/** Port of getSectionRoster -- enrolled students for a section from CURRENT enrollment, existing
 *  marks for `attendanceDate` matched by student_id (see fn_mark_section_attendance's own comment
 *  for the same-day-transfer race this guards against). */
export async function getSectionRoster(schoolId: string, sectionId: string, attendanceDate: string): Promise<SectionRosterResult> {
  const academicYearId = await getCurrentAcademicYearId(schoolId);
  if (!academicYearId) throw new Error("No current academic year set for this school.");

  const { data: sectionRow, error: sectionError } = await supabase.from("section").select("name, class:class_id(name)").eq("id", sectionId).single();
  if (sectionError || !sectionRow) throw sectionError ?? new Error("Section not found.");
  const section = sectionRow as unknown as { name: string; class: { name: string } | null };

  const { data: enrollmentRows, error: enrollmentError } = await supabase
    .from("enrollment")
    .select("roll_number, student:student_id(id, admission_number, first_name, last_name)")
    .eq("school_id", schoolId)
    .eq("academic_year_id", academicYearId)
    .eq("section_id", sectionId);
  if (enrollmentError) throw enrollmentError;

  const roster = (enrollmentRows ?? []) as unknown as {
    roll_number: string | null;
    student: { id: string; admission_number: string; first_name: string; last_name: string } | null;
  }[];
  const studentIds = roster.map((r) => r.student?.id).filter((id): id is string => Boolean(id));

  const [holidayName, existingRes, photoUrls] = await Promise.all([
    getHolidayLabel(schoolId, attendanceDate),
    studentIds.length
      ? supabase.from("attendance_record").select("student_id, section_id, status, remarks").eq("school_id", schoolId).eq("attendance_date", attendanceDate).in("student_id", studentIds)
      : Promise.resolve({ data: [] as unknown[], error: null }),
    getCurrentPhotoUrls(schoolId, "student", studentIds),
  ]);
  if (existingRes.error) throw existingRes.error;

  const existingByStudent = new Map(
    ((existingRes.data ?? []) as unknown as { student_id: string; section_id: string; status: AttendanceStatus; remarks: string | null }[]).map((row) => [
      row.student_id,
      row,
    ]),
  );

  const students: RosterStudentRow[] = roster
    .filter((r): r is typeof r & { student: NonNullable<typeof r.student> } => Boolean(r.student))
    .map((r) => {
      const existing = existingByStudent.get(r.student.id);
      return {
        studentId: r.student.id,
        admissionNumber: r.student.admission_number,
        firstName: r.student.first_name,
        lastName: r.student.last_name,
        rollNumber: r.roll_number,
        photoUrl: photoUrls.get(r.student.id) ?? null,
        existingStatus: existing?.status ?? null,
        existingRemarks: existing?.remarks ?? null,
        markedInOtherSection: Boolean(existing && existing.section_id !== sectionId),
      };
    })
    .sort((a, b) => Number(a.rollNumber ?? 0) - Number(b.rollNumber ?? 0));

  return {
    sectionId,
    className: section.class?.name ?? "",
    sectionName: section.name,
    academicYearId,
    attendanceDate,
    isNonTeachingDay: Boolean(holidayName) || isSundayIso(attendanceDate),
    nonTeachingDayLabel: holidayName ?? (isSundayIso(attendanceDate) ? "Sunday" : null),
    isToday: attendanceDate === todayIsoIst(),
    students,
  };
}

export async function getStudentAttendanceHistory(schoolId: string, studentId: string): Promise<StudentAttendanceHistoryRow[]> {
  const { data, error } = await supabase
    .from("attendance_record")
    .select("attendance_date, status, remarks")
    .eq("school_id", schoolId)
    .eq("student_id", studentId)
    .order("attendance_date", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as { attendance_date: string; status: AttendanceStatus; remarks: string | null }[]).map((row) => ({
    attendanceDate: row.attendance_date,
    status: row.status,
    remarks: row.remarks,
  }));
}

/** Same percentage rule as fn_attendance_percentages (half_day=0.5, leave excluded, holidays
 *  excluded) -- see apps/web/src/lib/attendance/queries.ts's getStudentAttendanceSummary for why
 *  computing this in JS is fine at "one student's own history" scale. */
export async function getStudentAttendanceSummary(
  schoolId: string,
  studentId: string,
): Promise<{ history: StudentAttendanceHistoryRow[]; daysMarked: number; percent: number | null }> {
  const [history, holidaysRes] = await Promise.all([getStudentAttendanceHistory(schoolId, studentId), supabase.from("holiday").select("date").eq("school_id", schoolId)]);
  const holidayDates = new Set(((holidaysRes.data ?? []) as unknown as { date: string }[]).map((h) => h.date));

  const counted = history.filter((row) => row.status !== "leave" && !holidayDates.has(row.attendanceDate));
  const effectivePresent = counted.reduce((sum, row) => {
    if (row.status === "present" || row.status === "late") return sum + 1;
    if (row.status === "half_day") return sum + 0.5;
    return sum;
  }, 0);

  return {
    history,
    daysMarked: counted.length,
    percent: counted.length > 0 ? Math.round((effectivePresent / counted.length) * 10000) / 100 : null,
  };
}
