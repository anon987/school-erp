import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import { getCurrentAcademicYearId } from "@/lib/core/school/getCurrentAcademicYear";
import { getCurrentStaffId } from "@/lib/core/auth/currentStaff";
import { hasPermission } from "@/lib/core/auth/permissions";
import { isSundayIso, todayIsoIst } from "@/lib/core/dateIst";
import { getCurrentPhotoUrls } from "@/lib/core/documents/queries";
import type {
  AttendanceStatus,
  DailyAttendanceSectionSummary,
  FlaggedStudentRow,
  MonthlyAttendanceStudentRow,
  RosterStudentRow,
  SectionRosterResult,
  StaffMonthlyAttendanceRow,
  StaffRosterRow,
  StudentAttendanceHistoryRow,
} from "./types";

async function getHolidayLabel(schoolId: string, date: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("holiday").select("name").eq("school_id", schoolId).eq("date", date).maybeSingle();
  return (data as unknown as { name: string } | null)?.name ?? null;
}

export async function getAttendanceThresholdPercent(schoolId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("attendance_threshold_setting").select("threshold_percent").eq("school_id", schoolId).maybeSingle();
  const value = (data as unknown as { threshold_percent: number } | null)?.threshold_percent;
  return value ?? 75;
}

export interface MarkableSection {
  sectionId: string;
  className: string;
  sectionName: string;
}

/**
 * Which sections the current user may pick from the marking screen: every section for
 * attendance.manage (school_owner/school_admin/principal correcting or catching up any class),
 * or only the section(s) they're the class teacher of for attendance.mark_own_class. An empty
 * result means the caller has neither permission -- the page shows a permission message instead
 * of a picker.
 */
export async function getMarkableSections(schoolId: string): Promise<MarkableSection[]> {
  const supabase = await createSupabaseServerClient();

  if (await hasPermission("attendance.manage")) {
    const { data, error } = await supabase.from("section").select("id, name, class:class_id(name, sort_order)").eq("school_id", schoolId);
    if (error) throw error;
    return ((data ?? []) as unknown as { id: string; name: string; class: { name: string; sort_order: number } | null }[])
      .sort((a, b) => (a.class?.sort_order ?? 0) - (b.class?.sort_order ?? 0) || a.name.localeCompare(b.name))
      .map((s) => ({ sectionId: s.id, className: s.class?.name ?? "", sectionName: s.name }));
  }

  if (!(await hasPermission("attendance.mark_own_class"))) return [];

  const staffId = await getCurrentStaffId();
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

/** Every section, for the monthly report's picker -- read-only browsing, not gated like markable sections. */
export async function listAllSections(schoolId: string): Promise<MarkableSection[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("section").select("id, name, class:class_id(name, sort_order)").eq("school_id", schoolId);
  if (error) throw error;
  return ((data ?? []) as unknown as { id: string; name: string; class: { name: string; sort_order: number } | null }[])
    .sort((a, b) => (a.class?.sort_order ?? 0) - (b.class?.sort_order ?? 0) || a.name.localeCompare(b.name))
    .map((s) => ({ sectionId: s.id, className: s.class?.name ?? "", sectionName: s.name }));
}

/**
 * Enrolled students for a section, from CURRENT enrollment (not attendance_record) -- a student
 * who transferred out of this section no longer appears here even if they have historical rows
 * marked under it. Existing marks for `attendanceDate` are matched by student_id, not by
 * (section_id, date), so a student already marked today under a DIFFERENT section (a same-day
 * transfer race) still shows their existing status, flagged via `markedInOtherSection` rather
 * than silently missing or silently re-markable -- see fn_mark_section_attendance.
 */
export async function getSectionRoster(schoolId: string, sectionId: string, attendanceDate: string): Promise<SectionRosterResult> {
  const supabase = await createSupabaseServerClient();
  const academicYearId = await getCurrentAcademicYearId(schoolId);
  if (!academicYearId) throw new Error("No current academic year set for this school.");

  const { data: sectionRow, error: sectionError } = await supabase
    .from("section")
    .select("name, class:class_id(name)")
    .eq("id", sectionId)
    .single();
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
      ? supabase
          .from("attendance_record")
          .select("student_id, section_id, status, remarks")
          .eq("school_id", schoolId)
          .eq("attendance_date", attendanceDate)
          .in("student_id", studentIds)
      : Promise.resolve({ data: [] as unknown[], error: null }),
    getCurrentPhotoUrls(schoolId, "student", studentIds),
  ]);
  if (existingRes.error) throw existingRes.error;

  const existingByStudent = new Map(
    ((existingRes.data ?? []) as unknown as { student_id: string; section_id: string; status: AttendanceStatus; remarks: string | null }[]).map(
      (row) => [row.student_id, row],
    ),
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

export async function getStaffRoster(schoolId: string, attendanceDate: string): Promise<StaffRosterRow[]> {
  const supabase = await createSupabaseServerClient();

  const [staffRes, existingRes] = await Promise.all([
    supabase
      .from("staff")
      .select("id, employee_code, first_name, last_name, department_id, department:department_id(name)")
      .eq("school_id", schoolId)
      .eq("employment_status", "active")
      .order("first_name"),
    supabase.from("staff_attendance_record").select("staff_id, status").eq("school_id", schoolId).eq("attendance_date", attendanceDate),
  ]);
  if (staffRes.error) throw staffRes.error;
  if (existingRes.error) throw existingRes.error;

  const existingByStaff = new Map(
    ((existingRes.data ?? []) as unknown as { staff_id: string; status: AttendanceStatus }[]).map((row) => [row.staff_id, row.status]),
  );

  const staffRows = (staffRes.data ?? []) as unknown as {
    id: string;
    employee_code: string;
    first_name: string;
    last_name: string;
    department_id: string | null;
    department: { name: string } | null;
  }[];
  const photoUrls = await getCurrentPhotoUrls(schoolId, "staff", staffRows.map((s) => s.id));

  return staffRows.map((s) => ({
    staffId: s.id,
    employeeCode: s.employee_code,
    firstName: s.first_name,
    lastName: s.last_name,
    departmentId: s.department_id,
    departmentName: s.department?.name ?? null,
    photoUrl: photoUrls.get(s.id) ?? null,
    existingStatus: existingByStaff.get(s.id) ?? null,
  }));
}

/** Every class, for report filter dropdowns. */
export async function listClasses(schoolId: string): Promise<{ classId: string; className: string }[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("class").select("id, name, sort_order").eq("school_id", schoolId).order("sort_order");
  if (error) throw error;
  return ((data ?? []) as unknown as { id: string; name: string; sort_order: number }[]).map((c) => ({ classId: c.id, className: c.name }));
}

/** Daily report: every section, marked-or-not and its status breakdown, for one date -- optionally narrowed to one class. */
export async function getDailyAttendanceSummary(
  schoolId: string,
  attendanceDate: string,
  classId?: string,
): Promise<DailyAttendanceSectionSummary[]> {
  const supabase = await createSupabaseServerClient();
  const academicYearId = await getCurrentAcademicYearId(schoolId);
  if (!academicYearId) return [];

  let sectionsQuery = supabase.from("section").select("id, class_id, name, class:class_id(name)").eq("school_id", schoolId).order("name");
  if (classId) sectionsQuery = sectionsQuery.eq("class_id", classId);

  const [sectionsRes, enrollmentCountRes, recordsRes] = await Promise.all([
    sectionsQuery,
    supabase.from("enrollment").select("section_id").eq("school_id", schoolId).eq("academic_year_id", academicYearId),
    supabase
      .from("attendance_record")
      .select("section_id, status")
      .eq("school_id", schoolId)
      .eq("attendance_date", attendanceDate),
  ]);
  if (sectionsRes.error) throw sectionsRes.error;
  if (enrollmentCountRes.error) throw enrollmentCountRes.error;
  if (recordsRes.error) throw recordsRes.error;

  const totalBySection = new Map<string, number>();
  for (const row of (enrollmentCountRes.data ?? []) as unknown as { section_id: string }[]) {
    totalBySection.set(row.section_id, (totalBySection.get(row.section_id) ?? 0) + 1);
  }

  const summaryBySection = new Map<string, DailyAttendanceSectionSummary>();
  for (const s of (sectionsRes.data ?? []) as unknown as { id: string; class_id: string; name: string; class: { name: string } | null }[]) {
    summaryBySection.set(s.id, {
      sectionId: s.id,
      classId: s.class_id,
      className: s.class?.name ?? "",
      sectionName: s.name,
      totalStudents: totalBySection.get(s.id) ?? 0,
      marked: 0,
      present: 0,
      absent: 0,
      late: 0,
      halfDay: 0,
      leave: 0,
    });
  }

  for (const row of (recordsRes.data ?? []) as unknown as { section_id: string; status: AttendanceStatus }[]) {
    const summary = summaryBySection.get(row.section_id);
    if (!summary) continue;
    summary.marked += 1;
    if (row.status === "present") summary.present += 1;
    else if (row.status === "absent") summary.absent += 1;
    else if (row.status === "late") summary.late += 1;
    else if (row.status === "half_day") summary.halfDay += 1;
    else if (row.status === "leave") summary.leave += 1;
  }

  return Array.from(summaryBySection.values());
}

/** Monthly per-student grid for one section (or all sections of a class if sectionId is omitted). */
export async function getMonthlySummary(
  schoolId: string,
  sectionId: string,
  monthStartIso: string,
  monthEndIso: string,
): Promise<MonthlyAttendanceStudentRow[]> {
  const supabase = await createSupabaseServerClient();
  const academicYearId = await getCurrentAcademicYearId(schoolId);
  if (!academicYearId) return [];

  const [enrollmentRes, recordsRes] = await Promise.all([
    supabase
      .from("enrollment")
      .select("roll_number, student:student_id(id, first_name, last_name)")
      .eq("school_id", schoolId)
      .eq("academic_year_id", academicYearId)
      .eq("section_id", sectionId),
    supabase
      .from("attendance_record")
      .select("student_id, attendance_date, status")
      .eq("school_id", schoolId)
      .eq("section_id", sectionId)
      .gte("attendance_date", monthStartIso)
      .lte("attendance_date", monthEndIso),
  ]);
  if (enrollmentRes.error) throw enrollmentRes.error;
  if (recordsRes.error) throw recordsRes.error;

  const statusByStudentDate = new Map<string, Map<string, AttendanceStatus>>();
  for (const row of (recordsRes.data ?? []) as unknown as { student_id: string; attendance_date: string; status: AttendanceStatus }[]) {
    if (!statusByStudentDate.has(row.student_id)) statusByStudentDate.set(row.student_id, new Map());
    statusByStudentDate.get(row.student_id)?.set(row.attendance_date, row.status);
  }

  const enrollmentRows = (enrollmentRes.data ?? []) as unknown as {
    roll_number: string | null;
    student: { id: string; first_name: string; last_name: string } | null;
  }[];
  const monthlyStudentIds = enrollmentRows.map((r) => r.student?.id).filter((id): id is string => Boolean(id));
  const photoUrls = await getCurrentPhotoUrls(schoolId, "student", monthlyStudentIds);

  return enrollmentRows
    .filter((r): r is typeof r & { student: NonNullable<typeof r.student> } => Boolean(r.student))
    .map((r) => ({
      studentId: r.student.id,
      firstName: r.student.first_name,
      lastName: r.student.last_name,
      rollNumber: r.roll_number,
      photoUrl: photoUrls.get(r.student.id) ?? null,
      statusByDate: Object.fromEntries(statusByStudentDate.get(r.student.id) ?? []),
    }))
    .sort((a, b) => Number(a.rollNumber ?? 0) - Number(b.rollNumber ?? 0));
}

/** Every active staff member's attendance status per day for one month -- the staff equivalent of
 *  getMonthlySummary, for the P1 baseline "staff attendance" report. */
export async function getStaffMonthlyAttendance(schoolId: string, monthStartIso: string, monthEndIso: string): Promise<StaffMonthlyAttendanceRow[]> {
  const supabase = await createSupabaseServerClient();

  const [staffRes, recordsRes] = await Promise.all([
    supabase.from("staff").select("id, employee_code, first_name, last_name").eq("school_id", schoolId).eq("employment_status", "active").order("first_name"),
    supabase
      .from("staff_attendance_record")
      .select("staff_id, attendance_date, status")
      .eq("school_id", schoolId)
      .gte("attendance_date", monthStartIso)
      .lte("attendance_date", monthEndIso),
  ]);
  if (staffRes.error) throw staffRes.error;
  if (recordsRes.error) throw recordsRes.error;

  const statusByStaffDate = new Map<string, Map<string, AttendanceStatus>>();
  for (const row of (recordsRes.data ?? []) as unknown as { staff_id: string; attendance_date: string; status: AttendanceStatus }[]) {
    if (!statusByStaffDate.has(row.staff_id)) statusByStaffDate.set(row.staff_id, new Map());
    statusByStaffDate.get(row.staff_id)?.set(row.attendance_date, row.status);
  }

  return ((staffRes.data ?? []) as unknown as { id: string; employee_code: string; first_name: string; last_name: string }[]).map((s) => ({
    staffId: s.id,
    employeeCode: s.employee_code,
    firstName: s.first_name,
    lastName: s.last_name,
    statusByDate: Object.fromEntries(statusByStaffDate.get(s.id) ?? []),
  }));
}

export async function getStudentAttendanceHistory(schoolId: string, studentId: string): Promise<StudentAttendanceHistoryRow[]> {
  const supabase = await createSupabaseServerClient();
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

/**
 * Same percentage rule as fn_attendance_percentages (half_day=0.5, leave excluded, holidays
 * excluded), computed here in JS rather than via that RPC -- unlike the flagged list (every
 * student, school-wide), this is bounded to ONE student's own history (at most a school year's
 * worth of rows, not proportional to school size), so the "aggregate in SQL, not JS" rule that
 * matters for the 2,000+ student case doesn't apply at this scale.
 */
export async function getStudentAttendanceSummary(
  schoolId: string,
  studentId: string,
): Promise<{ history: StudentAttendanceHistoryRow[]; daysMarked: number; percent: number | null }> {
  const supabase = await createSupabaseServerClient();
  const [history, holidaysRes] = await Promise.all([
    getStudentAttendanceHistory(schoolId, studentId),
    supabase.from("holiday").select("date").eq("school_id", schoolId),
  ]);
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

/**
 * Low-attendance flagged list. The percentage itself comes from fn_attendance_percentages -- a
 * server-side SQL aggregate over attendance_record, one row per student -- never a per-student
 * fetch-every-row-then-sum-in-JS loop (the same class of bug that undercounted the dashboard;
 * see apps/web/src/lib/dashboard/queries.ts's fix). Filtering against the threshold and joining
 * display fields (name, class, section) happens after, over the already-small (one row per
 * student, not per attendance day) result set.
 */
export async function getFlaggedLowAttendanceStudents(schoolId: string, classId?: string): Promise<FlaggedStudentRow[]> {
  const supabase = await createSupabaseServerClient();
  const academicYearId = await getCurrentAcademicYearId(schoolId);
  if (!academicYearId) return [];

  const [threshold, percentagesRes] = await Promise.all([
    getAttendanceThresholdPercent(schoolId),
    supabase.rpc("fn_attendance_percentages", { p_school_id: schoolId, p_academic_year_id: academicYearId }),
  ]);
  if (percentagesRes.error) throw percentagesRes.error;

  const flagged = ((percentagesRes.data ?? []) as unknown as { student_id: string; days_marked: number; percent: number }[]).filter(
    (row) => row.percent < threshold,
  );
  if (flagged.length === 0) return [];

  const flaggedIds = flagged.map((row) => row.student_id);
  let enrollmentQuery = supabase
    .from("enrollment")
    .select("student_id, class:class_id(name), section:section_id(name), student:student_id(admission_number, first_name, last_name)")
    .eq("school_id", schoolId)
    .eq("academic_year_id", academicYearId)
    .in("student_id", flaggedIds);
  if (classId) enrollmentQuery = enrollmentQuery.eq("class_id", classId);
  const { data: enrollmentRows, error: enrollmentError } = await enrollmentQuery;
  if (enrollmentError) throw enrollmentError;

  const detailByStudent = new Map(
    (
      (enrollmentRows ?? []) as unknown as {
        student_id: string;
        class: { name: string } | null;
        section: { name: string } | null;
        student: { admission_number: string; first_name: string; last_name: string } | null;
      }[]
    ).map((row) => [row.student_id, row]),
  );
  const photoUrls = await getCurrentPhotoUrls(schoolId, "student", Array.from(detailByStudent.keys()));

  return flagged
    .map((row) => {
      const detail = detailByStudent.get(row.student_id);
      if (!detail?.student) return null;
      return {
        studentId: row.student_id,
        admissionNumber: detail.student.admission_number,
        firstName: detail.student.first_name,
        lastName: detail.student.last_name,
        className: detail.class?.name ?? "",
        sectionName: detail.section?.name ?? "",
        photoUrl: photoUrls.get(row.student_id) ?? null,
        daysMarked: row.days_marked,
        percent: row.percent,
      } satisfies FlaggedStudentRow;
    })
    .filter((row): row is FlaggedStudentRow => row !== null)
    .sort((a, b) => a.percent - b.percent);
}
