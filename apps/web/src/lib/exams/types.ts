export type ExamStatus = "draft" | "marks_entry" | "pending_approval" | "approved" | "published";

export interface ExamRow {
  id: string;
  name: string;
  term: string | null;
  startDate: string | null;
  endDate: string | null;
  status: ExamStatus;
  computeRanks: boolean;
}

/** ExamRow plus class-scoping info -- only `getExams` (the list) needs this; `getExam` (single)
 *  callers don't use it, so it stays out of the base type rather than forcing every call site to
 *  populate it. No exam_class rows = applies to every class in the school (the default). */
export interface ExamListRow extends ExamRow {
  appliesToAllClasses: boolean;
  scopedClassCount: number;
}

export interface ExamSubjectRow {
  id: string;
  examId: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  maxMarks: number;
  passMarks: number;
  hasInternal: boolean;
  internalMaxMarks: number | null;
  /** How many students in this class already have a mark row for this exam_subject. */
  enteredCount: number;
  totalStudentCount: number;
  /** Datesheet fields for Admit Cards -- editable in place, unlike the marks fields above which
   *  stay delete-and-recreate-only. */
  examDate: string | null;
  startTime: string | null;
  endTime: string | null;
  roomNo: string | null;
}

export interface GradeBandOption {
  minPercentage: number;
  maxPercentage: number;
  gradeLabel: string;
  gradePoint: number | null;
}

export interface StudentMarkEntryRow {
  studentId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  rollNumber: string | null;
  marksObtained: number | null;
  internalMarksObtained: number | null;
  isAbsent: boolean;
  remarks: string | null;
}

export interface ReportCardSettings {
  template: string;
  showAttendance: boolean;
  showRemarks: boolean;
  showRank: boolean;
  footerNote: string | null;
}

export interface ReportCardSubjectRow {
  subjectName: string;
  maxMarks: number;
  marksObtained: number | null;
  internalMarksObtained: number | null;
  isAbsent: boolean;
  gradeLabel: string | null;
  remarks: string | null;
}

/** Holistic Progress Card (P2, §H) rating for one co-curricular/life-skill criterion. `ratingCode`/
 *  `ratingLabel`/`remarks` are null when a teacher hasn't rated this criterion yet -- rendered as
 *  a blank, not omitted, so the printed card always shows every configured criterion. */
export interface HpcRatingRow {
  criterionId: string;
  criterionName: string;
  ratingScaleId: string | null;
  ratingCode: string | null;
  ratingLabel: string | null;
  remarks: string | null;
}

export interface HpcData {
  coCurricular: HpcRatingRow[];
  lifeSkills: HpcRatingRow[];
}

export interface ReportCardData {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  fatherName: string | null;
  examName: string;
  academicYearName: string;
  subjects: ReportCardSubjectRow[];
  totalObtained: number;
  totalMax: number;
  percentage: number;
  overallGrade: string | null;
  rank: number | null;
  classSize: number | null;
  attendancePercent: number | null;
  settings: ReportCardSettings;
  /** Only populated when the report_card_setup this came from has include_hpc = true; null (not
   *  an empty object) means "this report card doesn't have an HPC section at all" -- the
   *  distinction the view/PDF renderers use to decide whether to print the section header. */
  hpc: HpcData | null;
}

/** P1 baseline "exam marks" report -- the raw marks grid for one exam+class, subject columns. */
export interface ExamMarksReportSubject {
  subjectId: string;
  subjectName: string;
  maxMarks: number;
  passMarks: number;
}

export interface ExamMarksReportRow {
  studentId: string;
  admissionNumber: string;
  studentName: string;
  rollNumber: string | null;
  /** subjectId -> obtained marks, or null if absent/not entered. */
  marksBySubject: Record<string, number | null>;
  totalObtained: number;
  totalMax: number;
  percentage: number;
  /** Fails if any subject is below its pass_marks, or the student was absent for any subject. */
  passed: boolean;
}

export interface ExamMarksReport {
  subjects: ExamMarksReportSubject[];
  rows: ExamMarksReportRow[];
}

/** P1 baseline "result summary" report -- pass/fail counts and percentage stats for one exam+class. */
export interface ResultSummaryReport {
  totalStudents: number;
  passedCount: number;
  failedCount: number;
  averagePercentage: number;
  highestPercentage: number;
  lowestPercentage: number;
}
