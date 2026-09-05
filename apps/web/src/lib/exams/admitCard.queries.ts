import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import { getCurrentPhotoUrl } from "@/lib/core/documents/queries";
import { DEFAULT_DOCUMENT_TEMPLATE } from "@/lib/core/pdf/documentTemplates";
import { getExam } from "./queries";
import type { AdmitCardData, AdmitCardDatesheetRow, AdmitCardEligibility, AdmitCardListRow, AdmitCardSettings, ExamAdmitCardSettings, FeeLockMode } from "./admitCard.types";

const DEFAULT_ADMIT_CARD_SETTINGS: AdmitCardSettings = { template: DEFAULT_DOCUMENT_TEMPLATE };

export async function getSectionOptions(schoolId: string, classId: string): Promise<{ id: string; name: string }[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("section").select("id, name").eq("school_id", schoolId).eq("class_id", classId).order("name");
  if (error) throw error;
  return (data ?? []) as unknown as { id: string; name: string }[];
}

const DEFAULT_EXAM_ADMIT_CARD_SETTINGS: ExamAdmitCardSettings = {
  template: null,
  releaseEnabled: false,
  availableFrom: null,
  availableUntil: null,
  feeLockMode: "off",
  feeLockMaxDuePaise: 0,
  instructions: null,
  reportingTime: null,
  examCentre: null,
  principalName: null,
  controllerOfExams: null,
  hallTicketPrefix: null,
  showStudentPhoto: true,
  showSignatureLines: true,
};

export async function getAdmitCardSettings(schoolId: string): Promise<AdmitCardSettings> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("admit_card_settings").select("template").eq("school_id", schoolId).maybeSingle();
  if (error) throw error;
  if (!data) return DEFAULT_ADMIT_CARD_SETTINGS;
  return { template: (data as unknown as { template: string }).template };
}

export async function getExamAdmitCardSettings(schoolId: string, examId: string): Promise<ExamAdmitCardSettings> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("exam_admit_card_settings")
    .select(
      "template, release_enabled, available_from, available_until, fee_lock_mode, fee_lock_max_due_paise, instructions, reporting_time, exam_centre, principal_name, controller_of_exams, hall_ticket_prefix, show_student_photo, show_signature_lines",
    )
    .eq("exam_id", examId)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return DEFAULT_EXAM_ADMIT_CARD_SETTINGS;
  const row = data as unknown as {
    template: string | null;
    release_enabled: boolean;
    available_from: string | null;
    available_until: string | null;
    fee_lock_mode: FeeLockMode;
    fee_lock_max_due_paise: number;
    instructions: string | null;
    reporting_time: string | null;
    exam_centre: string | null;
    principal_name: string | null;
    controller_of_exams: string | null;
    hall_ticket_prefix: string | null;
    show_student_photo: boolean;
    show_signature_lines: boolean;
  };
  return {
    template: row.template,
    releaseEnabled: row.release_enabled,
    availableFrom: row.available_from,
    availableUntil: row.available_until,
    feeLockMode: row.fee_lock_mode,
    feeLockMaxDuePaise: row.fee_lock_max_due_paise,
    instructions: row.instructions,
    reportingTime: row.reporting_time,
    examCentre: row.exam_centre,
    principalName: row.principal_name,
    controllerOfExams: row.controller_of_exams,
    hallTicketPrefix: row.hall_ticket_prefix,
    showStudentPhoto: row.show_student_photo,
    showSignatureLines: row.show_signature_lines,
  };
}

/** The template actually used for an exam's admit cards: its own override, or the school default. */
export async function getEffectiveAdmitCardTemplate(schoolId: string, examId: string): Promise<string> {
  const examSettings = await getExamAdmitCardSettings(schoolId, examId);
  if (examSettings.template) return examSettings.template;
  const schoolSettings = await getAdmitCardSettings(schoolId);
  return schoolSettings.template;
}

export function evaluateAdmitCardEligibility(settings: ExamAdmitCardSettings, dueAmountPaise: number, isHeld: boolean, holdReason: string | null): AdmitCardEligibility {
  if (isHeld) return { blocked: true, reason: holdReason ? `On hold: ${holdReason}` : "On hold." };
  if (settings.feeLockMode === "block" && dueAmountPaise > settings.feeLockMaxDuePaise) {
    return { blocked: true, reason: `Fee due (₹${(dueAmountPaise / 100).toLocaleString("en-IN")}) exceeds the allowed limit for admit cards.` };
  }
  return { blocked: false, reason: null };
}

type FatherByStudent = Map<string, string>;

async function getFatherNamesByStudent(schoolId: string, studentIds: string[]): Promise<FatherByStudent> {
  if (studentIds.length === 0) return new Map();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("student_guardian")
    .select("student_id, guardian:guardian_id(first_name, last_name)")
    .eq("school_id", schoolId)
    .eq("relationship_type", "father")
    .in("student_id", studentIds);
  if (error) throw error;
  const rows = (data ?? []) as unknown as { student_id: string; guardian: { first_name: string; last_name: string | null } | null }[];
  const map = new Map<string, string>();
  for (const r of rows) {
    if (r.guardian) map.set(r.student_id, `${r.guardian.first_name}${r.guardian.last_name ? ` ${r.guardian.last_name}` : ""}`);
  }
  return map;
}

/** Every enrolled student in this class+section, with due amount (reusing fn_list_students, the
 *  same aggregate the Students directory and Fees use), father's name, and hold status for this
 *  exam -- the data behind the Bulk Admit Cards list. */
export async function getAdmitCardListForClassSection(schoolId: string, examId: string, academicYearId: string, classId: string, sectionId: string): Promise<AdmitCardListRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("fn_list_students", {
    p_school_id: schoolId,
    p_academic_year_id: academicYearId,
    p_class_id: classId,
    p_section_id: sectionId,
    p_sort: "name",
    p_dir: "asc",
    p_limit: 2000,
    p_offset: 0,
  });
  if (error) throw error;

  const rows = (data ?? []) as unknown as { id: string; admission_number: string; first_name: string; last_name: string; roll_number: string | null; due_amount_paise: number }[];
  if (rows.length === 0) return [];

  const studentIds = rows.map((r) => r.id);
  const [fatherNames, holdRes] = await Promise.all([
    getFatherNamesByStudent(schoolId, studentIds),
    supabase.from("admit_card_hold").select("student_id, reason").eq("exam_id", examId).in("student_id", studentIds),
  ]);
  if (holdRes.error) throw holdRes.error;
  const holdByStudent = new Map(((holdRes.data ?? []) as unknown as { student_id: string; reason: string | null }[]).map((h) => [h.student_id, h.reason]));

  return rows.map((r) => ({
    studentId: r.id,
    admissionNumber: r.admission_number,
    rollNumber: r.roll_number,
    firstName: r.first_name,
    lastName: r.last_name,
    fatherName: fatherNames.get(r.id) ?? null,
    dueAmountPaise: r.due_amount_paise,
    isHeld: holdByStudent.has(r.id),
    holdReason: holdByStudent.get(r.id) ?? null,
  }));
}

/** One student's full admit card: identity, photo, datesheet (from exam_subject's schedule
 *  columns for their class), and the settings/eligibility inputs the PDF route re-checks before
 *  rendering. */
export async function getAdmitCardData(schoolId: string, examId: string, studentId: string): Promise<AdmitCardData | null> {
  const supabase = await createSupabaseServerClient();

  const exam = await getExam(schoolId, examId);
  if (!exam) return null;

  const [{ data: studentRow, error: studentError }, { data: academicYearRow }] = await Promise.all([
    supabase.from("student").select("first_name, last_name, admission_number").eq("id", studentId).eq("school_id", schoolId).maybeSingle(),
    supabase.from("academic_year").select("name").eq("id", exam.academicYearId).maybeSingle(),
  ]);
  if (studentError) throw studentError;
  if (!studentRow) return null;
  const student = studentRow as unknown as { first_name: string; last_name: string; admission_number: string };
  const academicYearName = (academicYearRow as unknown as { name: string } | null)?.name ?? "";

  const { data: enrollmentRow } = await supabase
    .from("enrollment")
    .select("roll_number, class_id, section_id, class:class_id(name), section:section_id(name)")
    .eq("school_id", schoolId)
    .eq("student_id", studentId)
    .eq("academic_year_id", exam.academicYearId)
    .maybeSingle();
  const enrollment = enrollmentRow as unknown as { roll_number: string | null; class_id: string; section_id: string; class: { name: string } | null; section: { name: string } | null } | null;
  if (!enrollment) return null;

  const [{ data: subjectRows, error: subjectError }, settings, listForSection] = await Promise.all([
    supabase.from("exam_subject").select("subject:subject_id(name), exam_date, start_time, end_time, room_no").eq("exam_id", examId).eq("class_id", enrollment.class_id).order("exam_date"),
    getExamAdmitCardSettings(schoolId, examId),
    getAdmitCardListForClassSection(schoolId, examId, exam.academicYearId, enrollment.class_id, enrollment.section_id),
  ]);
  if (subjectError) throw subjectError;

  const datesheet: AdmitCardDatesheetRow[] = ((subjectRows ?? []) as unknown as { subject: { name: string } | null; exam_date: string | null; start_time: string | null; end_time: string | null; room_no: string | null }[]).map(
    (s) => ({ subjectName: s.subject?.name ?? "", examDate: s.exam_date, startTime: s.start_time, endTime: s.end_time, roomNo: s.room_no }),
  );

  const listRow = listForSection.find((r) => r.studentId === studentId) ?? null;
  const photoUrl = settings.showStudentPhoto ? await getCurrentPhotoUrl(schoolId, "student", studentId) : null;

  const hallTicketNumber = `${settings.hallTicketPrefix ?? ""}${enrollment.roll_number ?? student.admission_number}`;

  return {
    studentId,
    studentName: `${student.first_name} ${student.last_name}`,
    admissionNumber: student.admission_number,
    rollNumber: enrollment.roll_number,
    className: enrollment.class?.name ?? "",
    sectionName: enrollment.section?.name ?? "",
    photoUrl,
    examName: exam.name,
    academicYearName,
    datesheet,
    hallTicketNumber,
    settings,
    dueAmountPaise: listRow?.dueAmountPaise ?? 0,
    isHeld: listRow?.isHeld ?? false,
    holdReason: listRow?.holdReason ?? null,
  };
}
