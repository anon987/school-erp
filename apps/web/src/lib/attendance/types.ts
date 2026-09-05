export type AttendanceStatus = "present" | "absent" | "late" | "half_day" | "leave";

export interface RosterStudentRow {
  studentId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  rollNumber: string | null;
  photoUrl: string | null;
  existingStatus: AttendanceStatus | null;
  existingRemarks: string | null;
  /**
   * True when this student already has an attendance_record for this date under a DIFFERENT
   * section (a same-day mid-year transfer race -- see fn_mark_section_attendance). The marking
   * screen shows this row read-only with a note rather than letting a submit silently fail to
   * apply for just this one student.
   */
  markedInOtherSection: boolean;
}

export interface SectionRosterResult {
  sectionId: string;
  className: string;
  sectionName: string;
  academicYearId: string;
  attendanceDate: string;
  /** True if `attendanceDate` falls on a declared holiday OR a Sunday -- see markingScreen plan. */
  isNonTeachingDay: boolean;
  nonTeachingDayLabel: string | null;
  /** False once attendance_date is in the past relative to Asia/Kolkata "today" -- editable only via attendance.manage. */
  isToday: boolean;
  students: RosterStudentRow[];
}

export interface DailyAttendanceSectionSummary {
  sectionId: string;
  classId: string;
  className: string;
  sectionName: string;
  totalStudents: number;
  marked: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  leave: number;
}

export interface MonthlyAttendanceStudentRow {
  studentId: string;
  firstName: string;
  lastName: string;
  rollNumber: string | null;
  photoUrl: string | null;
  /** date (YYYY-MM-DD) -> status, only for dates this student has a record. */
  statusByDate: Record<string, AttendanceStatus>;
}

export interface StudentAttendanceHistoryRow {
  attendanceDate: string;
  status: AttendanceStatus;
  remarks: string | null;
}

export interface FlaggedStudentRow {
  studentId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  className: string;
  sectionName: string;
  photoUrl: string | null;
  daysMarked: number;
  percent: number;
}

export interface StaffMonthlyAttendanceRow {
  staffId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  statusByDate: Record<string, AttendanceStatus>;
}

export interface StaffRosterRow {
  staffId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  departmentId: string | null;
  departmentName: string | null;
  photoUrl: string | null;
  existingStatus: AttendanceStatus | null;
}
