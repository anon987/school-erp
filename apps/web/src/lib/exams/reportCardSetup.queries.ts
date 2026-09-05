import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import { getStudentAttendanceSummary } from "@/lib/attendance/queries";
import { getGradeBands, getExamClasses } from "./queries";
import { getHpcDataForStudent } from "./hpc.queries";
import { resolveGradeLabel } from "./grading";
import type { ReportCardSetup } from "./reportCardSetup.types";
import type { ReportCardData, ReportCardSettings } from "./types";

type SetupRow = {
  id: string;
  academic_year_id: string;
  name: string;
  template: string;
  compute_ranks: boolean;
  is_published: boolean;
  include_hpc: boolean;
  exams: { exam_id: string; weight_percent: number; exam: { name: string } | null }[];
};

const SETUP_SELECT = "id, academic_year_id, name, template, compute_ranks, is_published, include_hpc, exams:report_card_setup_exam(exam_id, weight_percent, exam:exam_id(name))";

function mapSetup(row: SetupRow): ReportCardSetup {
  return {
    id: row.id,
    academicYearId: row.academic_year_id,
    name: row.name,
    template: row.template,
    computeRanks: row.compute_ranks,
    isPublished: row.is_published,
    includeHpc: row.include_hpc,
    exams: row.exams.map((e) => ({ examId: e.exam_id, examName: e.exam?.name ?? "", weightPercent: e.weight_percent })),
  };
}

export async function getReportCardSetups(schoolId: string, academicYearId: string): Promise<ReportCardSetup[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("report_card_setup")
    .select(SETUP_SELECT)
    .eq("school_id", schoolId)
    .eq("academic_year_id", academicYearId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as SetupRow[]).map(mapSetup);
}

export async function getReportCardSetup(schoolId: string, setupId: string): Promise<ReportCardSetup | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("report_card_setup")
    .select(SETUP_SELECT)
    .eq("id", setupId)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapSetup(data as unknown as SetupRow);
}

/** Union of every class with configured subjects across the setup's component exams -- the
 *  class-picker for "generate a report card from this setup" doesn't need to guess which classes
 *  are relevant, `getExamClasses` (already built for the single-exam report card flow) already
 *  answers that per exam. */
export async function getReportCardSetupClasses(setup: ReportCardSetup): Promise<{ id: string; name: string }[]> {
  const perExam = await Promise.all(setup.exams.map((e) => getExamClasses(e.examId)));
  const seen = new Map<string, string>();
  for (const classes of perExam) for (const c of classes) seen.set(c.id, c.name);
  return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
}

/**
 * One student's weighted report card across every component exam of a setup. Reuses
 * fn_report_card_setup_results for the weighted percentage + rank (a student only gets a row
 * there if they have results in every component exam -- see the migration), and calls the
 * existing fn_exam_class_results once per component exam (a handful) to build one "subject" row
 * per exam -- see the plan notes for why this deliberately reuses ReportCardData/ReportCardView
 * as-is instead of a new per-subject cross-exam type.
 */
export async function getReportCardSetupData(schoolId: string, setupId: string, classId: string, studentId: string): Promise<ReportCardData | null> {
  const supabase = await createSupabaseServerClient();

  const setup = await getReportCardSetup(schoolId, setupId);
  if (!setup) return null;

  const { data: resultsRows, error: resultsError } = await supabase.rpc("fn_report_card_setup_results", { p_setup_id: setupId, p_class_id: classId });
  if (resultsError) throw resultsError;
  const results = (resultsRows ?? []) as unknown as { student_id: string; weighted_percentage: number; rank: number; exams_counted: number }[];
  const myResult = results.find((r) => r.student_id === studentId);
  if (!myResult) return null;

  const { data: studentRow, error: studentError } = await supabase.from("student").select("first_name, last_name, admission_number").eq("id", studentId).eq("school_id", schoolId).maybeSingle();
  if (studentError) throw studentError;
  if (!studentRow) return null;
  const student = studentRow as unknown as { first_name: string; last_name: string; admission_number: string };

  const [{ data: enrollmentRow }, { data: academicYearRow }, { data: guardianRows }, gradeBands, attendance, hpc] = await Promise.all([
    supabase.from("enrollment").select("class:class_id(name), section:section_id(name)").eq("school_id", schoolId).eq("student_id", studentId).eq("academic_year_id", setup.academicYearId).maybeSingle(),
    supabase.from("academic_year").select("name").eq("id", setup.academicYearId).maybeSingle(),
    supabase.from("student_guardian").select("guardian:guardian_id(first_name, last_name)").eq("school_id", schoolId).eq("student_id", studentId).eq("relationship_type", "father"),
    getGradeBands(schoolId),
    getStudentAttendanceSummary(schoolId, studentId),
    setup.includeHpc ? getHpcDataForStudent(schoolId, setupId, studentId) : Promise.resolve(null),
  ]);
  const enrollment = enrollmentRow as unknown as { class: { name: string } | null; section: { name: string } | null } | null;
  const academicYearName = (academicYearRow as unknown as { name: string } | null)?.name ?? "";
  const father = ((guardianRows ?? []) as unknown as { guardian: { first_name: string; last_name: string | null } | null }[])[0]?.guardian;
  const fatherName = father ? `${father.first_name}${father.last_name ? ` ${father.last_name}` : ""}` : null;

  const perExamResults = await Promise.all(
    setup.exams.map(async (e) => {
      const { data: rows } = await supabase.rpc("fn_exam_class_results", { p_exam_id: e.examId, p_class_id: classId });
      const row = ((rows ?? []) as unknown as { student_id: string; total_obtained: number; total_max: number; percentage: number }[]).find((r) => r.student_id === studentId);
      return { examName: e.examName, weightPercent: e.weightPercent, percentage: row?.percentage ?? 0 };
    }),
  );

  const settings: ReportCardSettings = { template: setup.template, showAttendance: true, showRemarks: true, showRank: setup.computeRanks, footerNote: null };

  return {
    studentId,
    studentName: `${student.first_name} ${student.last_name}`,
    admissionNumber: student.admission_number,
    className: enrollment?.class?.name ?? "",
    sectionName: enrollment?.section?.name ?? "",
    fatherName,
    examName: setup.name,
    academicYearName,
    subjects: perExamResults.map((e) => ({
      subjectName: e.examName,
      maxMarks: 100,
      marksObtained: e.percentage,
      internalMarksObtained: 0,
      isAbsent: false,
      gradeLabel: resolveGradeLabel(gradeBands, e.percentage),
      remarks: `Weight: ${e.weightPercent}%`,
    })),
    totalObtained: myResult.weighted_percentage,
    totalMax: 100,
    percentage: myResult.weighted_percentage,
    overallGrade: resolveGradeLabel(gradeBands, myResult.weighted_percentage),
    rank: setup.computeRanks ? myResult.rank : null,
    classSize: setup.computeRanks ? results.length : null,
    attendancePercent: attendance.percent,
    settings,
    hpc,
  };
}
