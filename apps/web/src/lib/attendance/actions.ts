"use server";

import { revalidatePath } from "next/cache";
import type { Json } from "@schoolerp/types";
import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import { getSession } from "@/lib/core/auth/session";
import { getCurrentStaffId } from "@/lib/core/auth/currentStaff";
import { hasPermission } from "@/lib/core/auth/permissions";
import { todayIsoIst } from "@/lib/core/dateIst";
import { attendanceThresholdInputSchema, markSectionAttendanceInputSchema, markStaffAttendanceInputSchema } from "./schemas";

export interface AttendanceActionState {
  error?: string;
  /** Student ids whose mark was NOT applied because they were already recorded today under a different section. */
  skippedOtherSection?: string[];
}

async function writeAuditLog(
  schoolId: string,
  actorAuthUserId: string,
  action: string,
  entityId: string | null,
  metadata: Json,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.from("audit_log").insert({ school_id: schoolId, actor_auth_user_id: actorAuthUserId, action, entity_type: "attendance", entity_id: entityId, metadata });
}

/**
 * Mirrors attendance_record_write's RLS policy (packages/db attendance migration) so the action
 * can return a clear error before the database ever rejects the write -- RLS stays the real
 * backstop, this is just the friendly version of the same rule: attendance.manage can mark/correct
 * any section any day; a class_teacher can only mark TODAY (Asia/Kolkata), and only their own
 * section (section.class_teacher_staff_id must be their own staff row).
 */
async function canMarkSection(schoolId: string, sectionId: string, attendanceDate: string): Promise<boolean> {
  if (await hasPermission("attendance.manage")) return true;
  if (attendanceDate !== todayIsoIst()) return false;
  if (!(await hasPermission("attendance.mark_own_class"))) return false;

  const staffId = await getCurrentStaffId();
  if (!staffId) return false;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("section").select("class_teacher_staff_id").eq("id", sectionId).eq("school_id", schoolId).maybeSingle();
  return (data as unknown as { class_teacher_staff_id: string | null } | null)?.class_teacher_staff_id === staffId;
}

export async function markSectionAttendance(input: unknown): Promise<AttendanceActionState> {
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const parsed = markSectionAttendanceInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const { sectionId, attendanceDate, marks } = parsed.data;

  if (!(await canMarkSection(session.schoolId, sectionId, attendanceDate))) {
    return { error: "You don't have permission to mark attendance for this section on this date." };
  }

  const supabase = await createSupabaseServerClient();

  const { data: sectionRow, error: sectionError } = await supabase
    .from("section")
    .select("class_id")
    .eq("id", sectionId)
    .eq("school_id", session.schoolId)
    .single();
  if (sectionError || !sectionRow) return { error: "Section not found." };
  const classId = (sectionRow as unknown as { class_id: string }).class_id;

  const { data: academicYear, error: academicYearError } = await supabase
    .from("academic_year")
    .select("id")
    .eq("school_id", session.schoolId)
    .eq("is_current", true)
    .maybeSingle();
  if (academicYearError || !academicYear) return { error: "No current academic year set for this school." };
  const academicYearId = (academicYear as unknown as { id: string }).id;

  // One round trip for the whole roster, via fn_mark_section_attendance (packages/db) -- not one
  // upsert call per student. That function's ON CONFLICT ... WHERE clause is what makes a same-day
  // mid-year section transfer safe (see its own comment); skipped_other_section surfaces the rare
  // case where this call lost that race to the student's other section.
  const { data, error } = await supabase.rpc("fn_mark_section_attendance", {
    p_school_id: session.schoolId,
    p_section_id: sectionId,
    p_class_id: classId,
    p_academic_year_id: academicYearId,
    p_attendance_date: attendanceDate,
    p_marked_by_auth_user_id: session.authUserId,
    p_marks: marks.map((m) => ({ student_id: m.studentId, status: m.status, remarks: m.remarks ?? null })),
  });
  if (error) return { error: error.message };

  const result = data as unknown as { written: number; skipped_other_section: string[] };

  await writeAuditLog(session.schoolId, session.authUserId, "attendance.marked", sectionId, {
    sectionId,
    attendanceDate,
    written: result.written,
    skippedOtherSection: result.skipped_other_section,
  });

  // §E "parent alerts on absence" (P2) -- one system notice per newly-marked-absent student, via
  // fn_notify_absence (packages/db, Communication migration). Best-effort: a notification failure
  // must never roll back or fail the attendance mark itself, the same "must not block the
  // primary operation" rule the admissions confirm flow's guardian-invite call follows.
  const skipped = new Set(result.skipped_other_section);
  for (const mark of marks) {
    if (mark.status !== "absent" || skipped.has(mark.studentId)) continue;
    const { error: notifyError } = await supabase.rpc("fn_notify_absence", {
      p_school_id: session.schoolId,
      p_student_id: mark.studentId,
      p_attendance_date: attendanceDate,
      p_marked_by_auth_user_id: session.authUserId,
    });
    if (notifyError) console.error("[attendance] fn_notify_absence failed:", notifyError.message);
  }

  revalidatePath("/academics/attendance");

  return result.skipped_other_section.length > 0 ? { skippedOtherSection: result.skipped_other_section } : {};
}

export async function markStaffAttendance(input: unknown): Promise<AttendanceActionState> {
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  if (!(await hasPermission("attendance.manage"))) return { error: "You don't have permission to mark staff attendance." };

  const parsed = markStaffAttendanceInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const { attendanceDate, marks } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const schoolId = session.schoolId;
  const rows = marks.map((m) => ({
    school_id: schoolId,
    staff_id: m.staffId,
    attendance_date: attendanceDate,
    status: m.status,
    remarks: m.remarks ?? null,
    marked_by_auth_user_id: session.authUserId,
  }));

  const { error } = await supabase.from("staff_attendance_record").upsert(rows, { onConflict: "school_id,staff_id,attendance_date" });
  if (error) return { error: error.message };

  await writeAuditLog(session.schoolId, session.authUserId, "attendance.staff_marked", null, { attendanceDate, count: marks.length });

  revalidatePath("/academics/attendance/staff");
  return {};
}

export async function updateAttendanceThreshold(input: unknown): Promise<AttendanceActionState> {
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  if (!(await hasPermission("attendance.manage"))) return { error: "You don't have permission to change the attendance threshold." };

  const parsed = attendanceThresholdInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("attendance_threshold_setting")
    .upsert({ school_id: session.schoolId, threshold_percent: parsed.data.thresholdPercent }, { onConflict: "school_id" });
  if (error) return { error: error.message };

  await writeAuditLog(session.schoolId, session.authUserId, "attendance.threshold_updated", null, { thresholdPercent: parsed.data.thresholdPercent });

  revalidatePath("/academics/attendance/reports");
  return {};
}
