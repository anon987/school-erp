import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import { getStudentAttendanceSummary } from "@/lib/attendance/queries";
import { DEFAULT_DOCUMENT_TEMPLATE } from "@/lib/core/pdf/documentTemplates";
import { resolveGradeLabel } from "./grading";
import type {
  ExamRow,
  ExamListRow,
  ExamMarksReport,
  ExamSubjectRow,
  ExamStatus,
  GradeBandOption,
  ReportCardData,
  ReportCardSettings,
  ResultSummaryReport,
  StudentMarkEntryRow,
} from "./types";

export async function getClassOptions(schoolId: string): Promise<{ id: string; name: string }[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("class").select("id, name").eq("school_id", schoolId).order("sort_order");
  if (error) throw error;
  return (data ?? []) as unknown as { id: string; name: string }[];
}

export async function getSubjectOptions(schoolId: string): Promise<{ id: string; name: string }[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("subject").select("id, name").eq("school_id", schoolId).order("name");
  if (error) throw error;
  return (data ?? []) as unknown as { id: string; name: string }[];
}

export async function getExams(schoolId: string, academicYearId: string): Promise<ExamListRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("exam")
    .select("id, name, term, start_date, end_date, status, compute_ranks, exam_class(class_id)")
    .eq("school_id", schoolId)
    .eq("academic_year_id", academicYearId)
    .order("start_date", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (
    (data ?? []) as unknown as {
      id: string;
      name: string;
      term: string | null;
      start_date: string | null;
      end_date: string | null;
      status: ExamStatus;
      compute_ranks: boolean;
      exam_class: { class_id: string }[];
    }[]
  ).map((r) => ({
    id: r.id,
    name: r.name,
    term: r.term,
    startDate: r.start_date,
    endDate: r.end_date,
    status: r.status,
    computeRanks: r.compute_ranks,
    appliesToAllClasses: r.exam_class.length === 0,
    scopedClassCount: r.exam_class.length,
  }));
}

export async function getExam(schoolId: string, examId: string): Promise<(ExamRow & { academicYearId: string }) | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("exam")
    .select("id, academic_year_id, name, term, start_date, end_date, status, compute_ranks")
    .eq("id", examId)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as {
    id: string;
    academic_year_id: string;
    name: string;
    term: string | null;
    start_date: string | null;
    end_date: string | null;
    status: ExamStatus;
    compute_ranks: boolean;
  };
  return {
    id: row.id,
    academicYearId: row.academic_year_id,
    name: row.name,
    term: row.term,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    computeRanks: row.compute_ranks,
  };
}

/**
 * Entered/total counts are per-exam_subject head:true counts (N small queries, N = subjects in
 * one exam -- a handful), not a single query collecting every student id into JS -- the same
 * "compute in SQL, never over a JS-collected id list" lesson as Fees' large-school fixes, just at
 * a scale (one exam's subject count) where per-subject counting is itself the safe shape.
 */
export async function getExamSubjects(schoolId: string, examId: string, academicYearId: string): Promise<ExamSubjectRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("exam_subject")
    .select("id, exam_id, class_id, class:class_id(name), subject_id, subject:subject_id(name), max_marks, pass_marks, has_internal, internal_max_marks, exam_date, start_time, end_time, room_no")
    .eq("exam_id", examId)
    .order("class_id");
  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    id: string;
    exam_id: string;
    class_id: string;
    class: { name: string } | null;
    subject_id: string;
    subject: { name: string } | null;
    max_marks: number;
    pass_marks: number;
    has_internal: boolean;
    internal_max_marks: number | null;
    exam_date: string | null;
    start_time: string | null;
    end_time: string | null;
    room_no: string | null;
  }[];

  const counts = await Promise.all(
    rows.map(async (r) => {
      const [enrolledRes, enteredRes] = await Promise.all([
        supabase.from("enrollment").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("academic_year_id", academicYearId).eq("class_id", r.class_id),
        supabase.from("mark").select("id", { count: "exact", head: true }).eq("exam_subject_id", r.id),
      ]);
      return { examSubjectId: r.id, total: enrolledRes.count ?? 0, entered: enteredRes.count ?? 0 };
    }),
  );
  const countsById = new Map(counts.map((c) => [c.examSubjectId, c]));

  return rows.map((r) => ({
    id: r.id,
    examId: r.exam_id,
    classId: r.class_id,
    className: r.class?.name ?? "",
    subjectId: r.subject_id,
    subjectName: r.subject?.name ?? "",
    maxMarks: r.max_marks,
    passMarks: r.pass_marks,
    hasInternal: r.has_internal,
    internalMaxMarks: r.internal_max_marks,
    enteredCount: countsById.get(r.id)?.entered ?? 0,
    totalStudentCount: countsById.get(r.id)?.total ?? 0,
    examDate: r.exam_date,
    startTime: r.start_time,
    endTime: r.end_time,
    roomNo: r.room_no,
  }));
}

export interface ExamSubjectDetail {
  id: string;
  examId: string;
  examName: string;
  examStatus: ExamStatus;
  classId: string;
  className: string;
  subjectName: string;
  maxMarks: number;
  passMarks: number;
  hasInternal: boolean;
  internalMaxMarks: number | null;
  academicYearId: string;
}

export async function getExamSubjectDetail(schoolId: string, examSubjectId: string): Promise<ExamSubjectDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("exam_subject")
    .select(
      "id, class_id, class:class_id(name), subject:subject_id(name), max_marks, pass_marks, has_internal, internal_max_marks, " +
        "exam:exam_id!inner(id, name, status, academic_year_id)",
    )
    .eq("id", examSubjectId)
    .eq("exam.school_id", schoolId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as {
    id: string;
    class_id: string;
    class: { name: string } | null;
    subject: { name: string } | null;
    max_marks: number;
    pass_marks: number;
    has_internal: boolean;
    internal_max_marks: number | null;
    exam: { id: string; name: string; status: ExamStatus; academic_year_id: string };
  };

  return {
    id: row.id,
    examId: row.exam.id,
    examName: row.exam.name,
    examStatus: row.exam.status,
    classId: row.class_id,
    className: row.class?.name ?? "",
    subjectName: row.subject?.name ?? "",
    maxMarks: row.max_marks,
    passMarks: row.pass_marks,
    hasInternal: row.has_internal,
    internalMaxMarks: row.internal_max_marks,
    academicYearId: row.exam.academic_year_id,
  };
}

/** Every student enrolled in the class this exam_subject is for, plus their existing mark row if one exists yet. */
export async function getStudentsForMarksEntry(schoolId: string, classId: string, academicYearId: string, examSubjectId: string): Promise<StudentMarkEntryRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data: enrollmentRows, error: enrollmentError } = await supabase
    .from("enrollment")
    .select("roll_number, student:student_id!inner(id, admission_number, first_name, last_name)")
    .eq("school_id", schoolId)
    .eq("academic_year_id", academicYearId)
    .eq("class_id", classId)
    .order("student(first_name)");
  if (enrollmentError) throw enrollmentError;

  const students = (enrollmentRows ?? []) as unknown as {
    roll_number: string | null;
    student: { id: string; admission_number: string; first_name: string; last_name: string };
  }[];

  const { data: markRows, error: markError } = await supabase
    .from("mark")
    .select("student_id, marks_obtained, internal_marks_obtained, is_absent, remarks")
    .eq("exam_subject_id", examSubjectId);
  if (markError) throw markError;

  const marksByStudent = new Map(
    ((markRows ?? []) as unknown as { student_id: string; marks_obtained: number | null; internal_marks_obtained: number | null; is_absent: boolean; remarks: string | null }[]).map(
      (m) => [m.student_id, m],
    ),
  );

  return students.map((s) => {
    const mark = marksByStudent.get(s.student.id);
    return {
      studentId: s.student.id,
      admissionNumber: s.student.admission_number,
      firstName: s.student.first_name,
      lastName: s.student.last_name,
      rollNumber: s.roll_number,
      marksObtained: mark?.marks_obtained ?? null,
      internalMarksObtained: mark?.internal_marks_obtained ?? null,
      isAbsent: mark?.is_absent ?? false,
      remarks: mark?.remarks ?? null,
    };
  });
}

export async function getGradeBands(schoolId: string): Promise<GradeBandOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("grade_band")
    .select("min_percentage, max_percentage, grade_label, grade_point")
    .eq("school_id", schoolId)
    .order("min_percentage", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as { min_percentage: number; max_percentage: number; grade_label: string; grade_point: number | null }[]).map((g) => ({
    minPercentage: g.min_percentage,
    maxPercentage: g.max_percentage,
    gradeLabel: g.grade_label,
    gradePoint: g.grade_point,
  }));
}

const DEFAULT_REPORT_CARD_SETTINGS: ReportCardSettings = {
  template: DEFAULT_DOCUMENT_TEMPLATE,
  showAttendance: true,
  showRemarks: true,
  showRank: false,
  footerNote: null,
};

export async function getReportCardSettings(schoolId: string): Promise<ReportCardSettings> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("report_card_settings")
    .select("template, show_attendance, show_remarks, show_rank, footer_note")
    .eq("school_id", schoolId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return DEFAULT_REPORT_CARD_SETTINGS;
  const row = data as unknown as { template: string; show_attendance: boolean; show_remarks: boolean; show_rank: boolean; footer_note: string | null };
  return { template: row.template, showAttendance: row.show_attendance, showRemarks: row.show_remarks, showRank: row.show_rank, footerNote: row.footer_note };
}

/** Every distinct class this exam has subjects for -- drives the "Report Cards" index (pick a class, then a student). */
export async function getExamClasses(examId: string): Promise<{ id: string; name: string }[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("exam_subject").select("class_id, class:class_id(name)").eq("exam_id", examId);
  if (error) throw error;
  const rows = (data ?? []) as unknown as { class_id: string; class: { name: string } | null }[];
  const seen = new Map<string, string>();
  for (const r of rows) seen.set(r.class_id, r.class?.name ?? "");
  return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
}

/** Classes declared in scope for this exam ("which classes sit this exam?"), or every class in
 *  the school if none were declared -- drives the class dropdown on "Add Exam Subject", so a
 *  school that scoped an exam to a board practical doesn't see every other class as an option. */
export async function getExamApplicableClasses(schoolId: string, examId: string): Promise<{ id: string; name: string }[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("exam_class").select("class_id, class:class_id(name)").eq("exam_id", examId);
  if (error) throw error;
  const rows = (data ?? []) as unknown as { class_id: string; class: { name: string } | null }[];
  if (rows.length === 0) return getClassOptions(schoolId);
  return rows.map((r) => ({ id: r.class_id, name: r.class?.name ?? "" }));
}

export async function getExamScopedClassIds(examId: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("exam_class").select("class_id").eq("exam_id", examId);
  if (error) throw error;
  return ((data ?? []) as unknown as { class_id: string }[]).map((r) => r.class_id);
}

export async function getClassRoster(schoolId: string, classId: string, academicYearId: string): Promise<{ studentId: string; admissionNumber: string; firstName: string; lastName: string }[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("enrollment")
    .select("student:student_id!inner(id, admission_number, first_name, last_name)")
    .eq("school_id", schoolId)
    .eq("academic_year_id", academicYearId)
    .eq("class_id", classId)
    .order("student(first_name)");
  if (error) throw error;
  return ((data ?? []) as unknown as { student: { id: string; admission_number: string; first_name: string; last_name: string } }[]).map((r) => ({
    studentId: r.student.id,
    admissionNumber: r.student.admission_number,
    firstName: r.student.first_name,
    lastName: r.student.last_name,
  }));
}

/**
 * One student's full report card: their marks across every exam_subject for their class in this
 * exam, the invoice-style totals/grade computed here (not stored -- always derived fresh from
 * `mark`), rank/class size from fn_exam_class_results when the school has ranks enabled for this
 * exam, and attendance % reusing the same year-to-date summary the student profile's Attendance
 * tab already shows (not a report-period-specific figure -- a real per-term attendance query is
 * a larger addition than this pass's baseline needs).
 */
export async function getReportCardData(schoolId: string, examId: string, classId: string, studentId: string): Promise<ReportCardData | null> {
  const supabase = await createSupabaseServerClient();

  const { data: examRow, error: examError } = await supabase.from("exam").select("name, academic_year_id, compute_ranks, academic_year:academic_year_id(name)").eq("id", examId).eq("school_id", schoolId).maybeSingle();
  if (examError) throw examError;
  if (!examRow) return null;
  const exam = examRow as unknown as { name: string; academic_year_id: string; compute_ranks: boolean; academic_year: { name: string } | null };

  const { data: studentRow, error: studentError } = await supabase.from("student").select("first_name, last_name, admission_number").eq("id", studentId).eq("school_id", schoolId).maybeSingle();
  if (studentError) throw studentError;
  if (!studentRow) return null;
  const student = studentRow as unknown as { first_name: string; last_name: string; admission_number: string };

  const { data: enrollmentRow } = await supabase
    .from("enrollment")
    .select("class:class_id(name), section:section_id(name)")
    .eq("school_id", schoolId)
    .eq("student_id", studentId)
    .eq("academic_year_id", exam.academic_year_id)
    .maybeSingle();
  const enrollment = enrollmentRow as unknown as { class: { name: string } | null; section: { name: string } | null } | null;

  const { data: guardianRows } = await supabase
    .from("student_guardian")
    .select("relationship_type, guardian:guardian_id(first_name, last_name)")
    .eq("school_id", schoolId)
    .eq("student_id", studentId)
    .eq("relationship_type", "father");
  const father = ((guardianRows ?? []) as unknown as { guardian: { first_name: string; last_name: string | null } | null }[])[0]?.guardian;
  const fatherName = father ? (father.last_name ? `${father.first_name} ${father.last_name}` : father.first_name) : null;

  const [{ data: examSubjectRows, error: examSubjectError }, gradeBands, attendance, settings] = await Promise.all([
    supabase
      .from("exam_subject")
      .select("id, max_marks, subject:subject_id(name), mark(marks_obtained, internal_marks_obtained, is_absent, remarks, student_id)")
      .eq("exam_id", examId)
      .eq("class_id", classId),
    getGradeBands(schoolId),
    getStudentAttendanceSummary(schoolId, studentId),
    getReportCardSettings(schoolId),
  ]);
  if (examSubjectError) throw examSubjectError;

  const examSubjects = (examSubjectRows ?? []) as unknown as {
    id: string;
    max_marks: number;
    subject: { name: string } | null;
    mark: { marks_obtained: number | null; internal_marks_obtained: number | null; is_absent: boolean; remarks: string | null; student_id: string }[];
  }[];

  let totalObtained = 0;
  let totalMax = 0;
  const subjects = examSubjects.map((es) => {
    const mark = es.mark.find((m) => m.student_id === studentId) ?? null;
    const obtained = (mark?.marks_obtained ?? 0) + (mark?.internal_marks_obtained ?? 0);
    totalObtained += obtained;
    totalMax += es.max_marks;
    const percentage = es.max_marks > 0 ? (obtained / es.max_marks) * 100 : 0;
    return {
      subjectName: es.subject?.name ?? "",
      maxMarks: es.max_marks,
      marksObtained: mark?.marks_obtained ?? null,
      internalMarksObtained: mark?.internal_marks_obtained ?? null,
      isAbsent: mark?.is_absent ?? false,
      gradeLabel: mark && !mark.is_absent ? resolveGradeLabel(gradeBands, percentage) : null,
      remarks: mark?.remarks ?? null,
    };
  });

  const overallPercentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

  let rank: number | null = null;
  let classSize: number | null = null;
  if (exam.compute_ranks) {
    const { data: rankRows } = await supabase.rpc("fn_exam_class_results", { p_exam_id: examId, p_class_id: classId });
    const rows = (rankRows ?? []) as unknown as { student_id: string; rank: number }[];
    rank = rows.find((r) => r.student_id === studentId)?.rank ?? null;
    classSize = rows.length;
  }

  return {
    studentId,
    studentName: `${student.first_name} ${student.last_name}`,
    admissionNumber: student.admission_number,
    className: enrollment?.class?.name ?? "",
    sectionName: enrollment?.section?.name ?? "",
    fatherName,
    examName: exam.name,
    academicYearName: exam.academic_year?.name ?? "",
    subjects,
    totalObtained,
    totalMax,
    percentage: Math.round(overallPercentage * 100) / 100,
    overallGrade: resolveGradeLabel(gradeBands, overallPercentage),
    rank,
    classSize,
    attendancePercent: attendance.percent,
    settings,
    hpc: null,
  };
}

/** P1 baseline "exam marks" report -- the raw marks grid for one exam+class. A student "passes"
 *  only if every subject clears its own pass_marks and they weren't absent for any of them --
 *  matches how Indian schools describe a result ("failed" if you fail even one subject), not an
 *  overall-percentage-only cutoff. */
export async function getExamMarksReport(schoolId: string, examId: string, classId: string): Promise<ExamMarksReport> {
  const supabase = await createSupabaseServerClient();

  const [{ data: subjectRows, error: subjectError }, exam] = await Promise.all([
    supabase.from("exam_subject").select("id, max_marks, pass_marks, subject:subject_id(name)").eq("exam_id", examId).eq("class_id", classId),
    getExam(schoolId, examId),
  ]);
  if (subjectError) throw subjectError;
  if (!exam) return { subjects: [], rows: [] };

  const examSubjects = (subjectRows ?? []) as unknown as { id: string; max_marks: number; pass_marks: number; subject: { name: string } | null }[];
  if (examSubjects.length === 0) return { subjects: [], rows: [] };

  const [roster, { data: markRows, error: markError }] = await Promise.all([
    getClassRoster(schoolId, classId, exam.academicYearId),
    supabase.from("mark").select("exam_subject_id, student_id, marks_obtained, internal_marks_obtained, is_absent").in(
      "exam_subject_id",
      examSubjects.map((s) => s.id),
    ),
  ]);
  if (markError) throw markError;

  const marks = (markRows ?? []) as unknown as { exam_subject_id: string; student_id: string; marks_obtained: number | null; internal_marks_obtained: number | null; is_absent: boolean }[];
  const markByStudentSubject = new Map<string, { obtained: number | null; passMarks: number; isAbsent: boolean }>();
  for (const m of marks) {
    const es = examSubjects.find((s) => s.id === m.exam_subject_id);
    if (!es) continue;
    markByStudentSubject.set(`${m.student_id}::${es.id}`, {
      obtained: m.is_absent ? null : (m.marks_obtained ?? 0) + (m.internal_marks_obtained ?? 0),
      passMarks: es.pass_marks,
      isAbsent: m.is_absent,
    });
  }

  const totalMax = examSubjects.reduce((sum, s) => sum + s.max_marks, 0);

  const rows: ExamMarksReport["rows"] = roster.map((student) => {
    let totalObtained = 0;
    let passed = true;
    const marksBySubject: Record<string, number | null> = {};
    for (const es of examSubjects) {
      const entry = markByStudentSubject.get(`${student.studentId}::${es.id}`);
      if (!entry || entry.isAbsent) {
        marksBySubject[es.id] = null;
        passed = false;
        continue;
      }
      marksBySubject[es.id] = entry.obtained;
      totalObtained += entry.obtained ?? 0;
      if ((entry.obtained ?? 0) < entry.passMarks) passed = false;
    }
    return {
      studentId: student.studentId,
      admissionNumber: student.admissionNumber,
      studentName: `${student.firstName} ${student.lastName}`,
      rollNumber: null,
      marksBySubject,
      totalObtained,
      totalMax,
      percentage: totalMax > 0 ? Math.round((totalObtained / totalMax) * 10000) / 100 : 0,
      passed,
    };
  });

  return {
    subjects: examSubjects.map((s) => ({ subjectId: s.id, subjectName: s.subject?.name ?? "", maxMarks: s.max_marks, passMarks: s.pass_marks })),
    rows,
  };
}

/** P1 baseline "result summary" report -- built on top of getExamMarksReport's pass/fail
 *  computation rather than fn_exam_class_results, since pass/fail here is per-subject-aware and
 *  fn_exam_class_results only knows overall totals. */
export async function getResultSummaryReport(schoolId: string, examId: string, classId: string): Promise<ResultSummaryReport> {
  const { rows } = await getExamMarksReport(schoolId, examId, classId);
  if (rows.length === 0) return { totalStudents: 0, passedCount: 0, failedCount: 0, averagePercentage: 0, highestPercentage: 0, lowestPercentage: 0 };

  const percentages = rows.map((r) => r.percentage);
  const passedCount = rows.filter((r) => r.passed).length;

  return {
    totalStudents: rows.length,
    passedCount,
    failedCount: rows.length - passedCount,
    averagePercentage: Math.round((percentages.reduce((a, b) => a + b, 0) / rows.length) * 100) / 100,
    highestPercentage: Math.max(...percentages),
    lowestPercentage: Math.min(...percentages),
  };
}

