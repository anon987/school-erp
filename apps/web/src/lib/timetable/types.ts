export const DAY_NAMES: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

export interface StaffOption {
  id: string;
  name: string;
}

export interface StaffClassSubjectOption {
  id: string;
  subjectId: string;
  subjectName: string;
  staffId: string;
  staffName: string;
}

export interface TimetableSlotRow {
  id: string;
  dayOfWeek: number;
  periodId: string;
  room: string | null;
  staffClassSubjectId: string;
  subjectName: string;
  staffName: string;
  classId: string;
  sectionId: string;
}

export interface SubstitutionRow {
  id: string;
  timetableSlotId: string;
  substitutionDate: string;
  originalStaffName: string;
  substituteStaffId: string;
  substituteStaffName: string;
  reason: string | null;
}

export interface TeacherTimetableSlotRow extends TimetableSlotRow {
  className: string;
  sectionName: string;
}
