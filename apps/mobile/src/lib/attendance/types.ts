/** Subset of apps/web/src/lib/attendance/types.ts -- parent history view + teacher marking, not
 *  the staff-attendance or reports screens (those stay web-only for this pass). */
export type AttendanceStatus = "present" | "absent" | "late" | "half_day" | "leave";

export interface MarkableSection {
  sectionId: string;
  className: string;
  sectionName: string;
}

export interface RosterStudentRow {
  studentId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  rollNumber: string | null;
  photoUrl: string | null;
  existingStatus: AttendanceStatus | null;
  existingRemarks: string | null;
  markedInOtherSection: boolean;
}

export interface SectionRosterResult {
  sectionId: string;
  className: string;
  sectionName: string;
  academicYearId: string;
  attendanceDate: string;
  isNonTeachingDay: boolean;
  nonTeachingDayLabel: string | null;
  isToday: boolean;
  students: RosterStudentRow[];
}

export interface StudentAttendanceHistoryRow {
  attendanceDate: string;
  status: AttendanceStatus;
  remarks: string | null;
}
