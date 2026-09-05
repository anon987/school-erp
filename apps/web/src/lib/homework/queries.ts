import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import type { HomeworkRow, HomeworkSubmissionRow, HomeworkSubmissionStatus, PortalHomeworkRow, StaffClassSubjectOption } from "./types";

const SIGNED_URL_TTL_SECONDS = 3600;

/** This teacher's own class/section/subject assignments -- the compose form's "which class am I posting for" picker. */
export async function getMyStaffClassSubjects(schoolId: string, staffId: string, academicYearId: string): Promise<StaffClassSubjectOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("staff_class_subject")
    .select("id, class:class_id(name), section:section_id(name), subject:subject_id(name)")
    .eq("school_id", schoolId)
    .eq("staff_id", staffId)
    .eq("academic_year_id", academicYearId);
  if (error) throw error;

  return (
    (data ?? []) as unknown as { id: string; class: { name: string } | null; section: { name: string } | null; subject: { name: string } | null }[]
  ).map((r) => ({ id: r.id, className: r.class?.name ?? "", sectionName: r.section?.name ?? "", subjectName: r.subject?.name ?? "" }));
}

export async function getHomeworkList(schoolId: string): Promise<HomeworkRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("homework")
    .select("id, title, description, due_date, published_at, created_at, class:class_id(name), section:section_id(name), subject:subject_id(name), staff:staff_id(first_name, last_name)")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (
    (data ?? []) as unknown as {
      id: string;
      title: string;
      description: string;
      due_date: string;
      published_at: string | null;
      created_at: string;
      class: { name: string } | null;
      section: { name: string } | null;
      subject: { name: string } | null;
      staff: { first_name: string; last_name: string } | null;
    }[]
  ).map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    dueDate: r.due_date,
    className: r.class?.name ?? "",
    sectionName: r.section?.name ?? "",
    subjectName: r.subject?.name ?? "",
    staffName: r.staff ? `${r.staff.first_name} ${r.staff.last_name}` : "",
    publishedAt: r.published_at,
    createdAt: r.created_at,
  }));
}

export async function getHomeworkDetail(schoolId: string, homeworkId: string): Promise<HomeworkRow | null> {
  const list = await getHomeworkList(schoolId);
  return list.find((h) => h.id === homeworkId) ?? null;
}

export async function getSubmissions(schoolId: string, homeworkId: string): Promise<HomeworkSubmissionRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("homework_submission")
    .select(
      "id, status, content, submitted_at, teacher_remarks, reviewed_at, document:document_id(storage_path), student:student_id(id, first_name, last_name, admission_number)",
    )
    .eq("school_id", schoolId)
    .eq("homework_id", homeworkId);
  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    id: string;
    status: HomeworkSubmissionStatus;
    content: string | null;
    submitted_at: string | null;
    teacher_remarks: string | null;
    reviewed_at: string | null;
    document: { storage_path: string } | null;
    student: { id: string; first_name: string; last_name: string; admission_number: string } | null;
  }[];

  const paths = rows.map((r) => r.document?.storage_path).filter((p): p is string => Boolean(p));
  const urlByPath = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage.from("documents").createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
    for (const item of signed ?? []) {
      if (item.signedUrl && !item.error) urlByPath.set(item.path ?? "", item.signedUrl);
    }
  }

  return rows
    .filter((r) => r.student)
    .map((r) => ({
      id: r.id,
      studentId: r.student!.id,
      studentName: `${r.student!.first_name} ${r.student!.last_name}`,
      admissionNumber: r.student!.admission_number,
      status: r.status,
      content: r.content,
      submittedAt: r.submitted_at,
      teacherRemarks: r.teacher_remarks,
      reviewedAt: r.reviewed_at,
      documentUrl: r.document?.storage_path ? (urlByPath.get(r.document.storage_path) ?? null) : null,
    }))
    .sort((a, b) => a.studentName.localeCompare(b.studentName));
}

export async function getPortalHomework(studentId: string): Promise<PortalHomeworkRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("homework_submission")
    .select(
      "id, status, content, teacher_remarks, document:document_id(storage_path), homework:homework_id(id, title, description, due_date, published_at, subject:subject_id(name))",
    )
    .eq("student_id", studentId);
  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    id: string;
    status: HomeworkSubmissionStatus;
    content: string | null;
    teacher_remarks: string | null;
    document: { storage_path: string } | null;
    homework: { id: string; title: string; description: string; due_date: string; published_at: string | null; subject: { name: string } | null } | null;
  }[];

  const paths = rows.map((r) => r.document?.storage_path).filter((p): p is string => Boolean(p));
  const urlByPath = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage.from("documents").createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
    for (const item of signed ?? []) {
      if (item.signedUrl && !item.error) urlByPath.set(item.path ?? "", item.signedUrl);
    }
  }

  return rows
    .filter((r) => r.homework && r.homework.published_at)
    .map((r) => ({
      submissionId: r.id,
      homeworkId: r.homework!.id,
      title: r.homework!.title,
      description: r.homework!.description,
      dueDate: r.homework!.due_date,
      subjectName: r.homework!.subject?.name ?? "",
      status: r.status,
      content: r.content,
      teacherRemarks: r.teacher_remarks,
      documentUrl: r.document?.storage_path ? (urlByPath.get(r.document.storage_path) ?? null) : null,
    }))
    .sort((a, b) => (a.dueDate < b.dueDate ? 1 : -1));
}
