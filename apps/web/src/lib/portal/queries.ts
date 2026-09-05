import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import { getCurrentAcademicYearId } from "@/lib/core/school/getCurrentAcademicYear";
import type { GuardianProfile, LeaveApplicationRow, LeaveApplicationStatus, LinkedStudentRow, PortalExamRow } from "./types";

/**
 * Two queries, not one embedded one: filtering an EMBEDDED resource (student.enrollment) by
 * academic_year_id via PostgREST dot-notation is fragile across supabase-js versions -- fetching
 * this guardian's student ids, then this year's enrollments for exactly those ids, and merging in
 * JS is the same "two-step, not one fragile embed" shape master-data's queries.ts already uses
 * for class_subject.
 */
export async function getLinkedStudents(schoolId: string, guardianId: string): Promise<LinkedStudentRow[]> {
  const supabase = await createSupabaseServerClient();

  const { data: linkRows, error: linkError } = await supabase
    .from("student_guardian")
    .select("student:student_id(id, admission_number, first_name, last_name)")
    .eq("guardian_id", guardianId);
  if (linkError) throw linkError;

  const students = ((linkRows ?? []) as unknown as { student: { id: string; admission_number: string; first_name: string; last_name: string } | null }[])
    .map((r) => r.student)
    .filter((s): s is { id: string; admission_number: string; first_name: string; last_name: string } => Boolean(s));
  if (students.length === 0) return [];

  const currentYearId = await getCurrentAcademicYearId(schoolId);
  const studentIds = students.map((s) => s.id);

  const { data: enrollmentRows } = currentYearId
    ? await supabase
        .from("enrollment")
        .select("student_id, class:class_id(name), section:section_id(name)")
        .eq("academic_year_id", currentYearId)
        .in("student_id", studentIds)
    : { data: [] };

  const enrollmentByStudent = new Map(
    ((enrollmentRows ?? []) as unknown as { student_id: string; class: { name: string } | null; section: { name: string } | null }[]).map((e) => [
      e.student_id,
      e,
    ]),
  );

  return students.map((s) => {
    const enrollment = enrollmentByStudent.get(s.id);
    return {
      id: s.id,
      admissionNumber: s.admission_number,
      firstName: s.first_name,
      lastName: s.last_name,
      className: enrollment?.class?.name ?? null,
      sectionName: enrollment?.section?.name ?? null,
    } satisfies LinkedStudentRow;
  });
}

/** Every exam this student has at least one mark in, where the exam is published -- `mark`'s own
 * parent-read RLS policy already enforces "published only", this filter is defense-in-depth, not
 * the actual gate. */
export async function getPortalExamsForStudent(studentId: string): Promise<PortalExamRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("mark")
    .select("exam_subject:exam_subject_id(class_id, exam:exam_id(id, name, term, status))")
    .eq("student_id", studentId);
  if (error) throw error;

  const seen = new Map<string, PortalExamRow>();
  for (const row of (data ?? []) as unknown as {
    exam_subject: { class_id: string; exam: { id: string; name: string; term: string | null; status: string } | null } | null;
  }[]) {
    const examSubject = row.exam_subject;
    const exam = examSubject?.exam;
    if (!examSubject || !exam || exam.status !== "published") continue;
    if (!seen.has(exam.id)) seen.set(exam.id, { id: exam.id, name: exam.name, term: exam.term, classId: examSubject.class_id });
  }
  return Array.from(seen.values());
}

export async function getLeaveApplications(studentId: string): Promise<LeaveApplicationRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("student_leave_application")
    .select("id, from_date, to_date, reason, status, created_at, reviewed_at")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as {
    id: string;
    from_date: string;
    to_date: string;
    reason: string;
    status: LeaveApplicationStatus;
    created_at: string;
    reviewed_at: string | null;
  }[]).map((r) => ({
    id: r.id,
    studentId,
    fromDate: r.from_date,
    toDate: r.to_date,
    reason: r.reason,
    status: r.status,
    createdAt: r.created_at,
    reviewedAt: r.reviewed_at,
  }));
}

export async function getGuardianProfile(guardianId: string): Promise<GuardianProfile | null> {
  const supabase = await createSupabaseServerClient();
  const { data: guardian, error: guardianError } = await supabase
    .from("guardian")
    .select("id, first_name, last_name")
    .eq("id", guardianId)
    .maybeSingle();
  if (guardianError) throw guardianError;
  if (!guardian) return null;
  const g = guardian as unknown as { id: string; first_name: string; last_name: string | null };

  const { data: linkRows, error: linkError } = await supabase
    .from("student_guardian")
    .select("relationship_type, phone, email, student:student_id(id, first_name, last_name)")
    .eq("guardian_id", guardianId);
  if (linkError) throw linkError;

  const links = ((linkRows ?? []) as unknown as {
    relationship_type: string;
    phone: string | null;
    email: string | null;
    student: { id: string; first_name: string; last_name: string } | null;
  }[])
    .filter((r) => r.student)
    .map((r) => ({
      studentId: r.student!.id,
      studentName: `${r.student!.first_name} ${r.student!.last_name}`,
      relationshipType: r.relationship_type,
      phone: r.phone,
    }));

  const primaryEmail = ((linkRows ?? []) as unknown as { email: string | null }[]).find((r) => r.email)?.email ?? null;

  return { guardianId: g.id, firstName: g.first_name, lastName: g.last_name, email: primaryEmail, links };
}
