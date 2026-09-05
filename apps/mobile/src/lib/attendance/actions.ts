import type { Json } from "@schoolerp/types";
import { supabase } from "../core/supabase/client";
import { getCurrentStaffId } from "../core/auth/currentStaff";
import { hasPermission } from "../core/auth/permissions";
import { todayIsoIst } from "../core/dateIst";
import type { StaffSession } from "../core/auth/types";
import { markSectionAttendanceInputSchema } from "./schemas";

export interface AttendanceActionState {
  error?: string;
  /** Student ids whose mark was NOT applied because they were already recorded today under a different section. */
  skippedOtherSection?: string[];
}

async function writeAuditLog(schoolId: string, actorAuthUserId: string, action: string, entityId: string | null, metadata: Json): Promise<void> {
  await supabase.from("audit_log").insert({ school_id: schoolId, actor_auth_user_id: actorAuthUserId, action, entity_type: "attendance", entity_id: entityId, metadata });
}

/**
 * Mirrors apps/web/src/lib/attendance/actions.ts's canMarkSection -- a friendly pre-check before
 * ever attempting the write; attendance_record_write's RLS policy is the real backstop, same as
 * web. No "use server" boundary exists on mobile, so this whole sequence (permission check, RPC,
 * audit log, absence notification) runs directly against the caller's own RLS-scoped client,
 * exactly what the web Server Action itself does under the hood -- there is no service-role step
 * anywhere in this flow, so nothing here needed to move to apps/worker.
 */
async function canMarkSection(session: StaffSession, sectionId: string, attendanceDate: string): Promise<boolean> {
  if (await hasPermission(session.roles, "attendance.manage")) return true;
  if (attendanceDate !== todayIsoIst()) return false;
  if (!(await hasPermission(session.roles, "attendance.mark_own_class"))) return false;

  const staffId = await getCurrentStaffId(session.authUserId, session.schoolId);
  if (!staffId) return false;

  const { data } = await supabase.from("section").select("class_teacher_staff_id").eq("id", sectionId).eq("school_id", session.schoolId).maybeSingle();
  return (data as unknown as { class_teacher_staff_id: string | null } | null)?.class_teacher_staff_id === staffId;
}

export async function markSectionAttendance(
  session: StaffSession,
  input: { sectionId: string; attendanceDate: string; marks: { studentId: string; status: string; remarks?: string }[] },
): Promise<AttendanceActionState> {
  const parsed = markSectionAttendanceInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const { sectionId, attendanceDate, marks } = parsed.data;

  if (!(await canMarkSection(session, sectionId, attendanceDate))) {
    return { error: "You don't have permission to mark attendance for this section on this date." };
  }

  const { data: sectionRow, error: sectionError } = await supabase.from("section").select("class_id").eq("id", sectionId).eq("school_id", session.schoolId).single();
  if (sectionError || !sectionRow) return { error: "Section not found." };
  const classId = (sectionRow as unknown as { class_id: string }).class_id;

  const { data: academicYear, error: academicYearError } = await supabase.from("academic_year").select("id").eq("school_id", session.schoolId).eq("is_current", true).maybeSingle();
  if (academicYearError || !academicYear) return { error: "No current academic year set for this school." };
  const academicYearId = (academicYear as unknown as { id: string }).id;

  // One round trip for the whole roster via fn_mark_section_attendance -- see web actions.ts's
  // comment for why (its ON CONFLICT ... WHERE clause is what makes a same-day section-transfer
  // race safe).
  const { data, error } = await supabase.rpc("fn_mark_section_attendance", {
    p_school_id: session.schoolId,
    p_section_id: sectionId,
    p_class_id: classId,
    p_academic_year_id: academicYearId,
    p_attendance_date: attendanceDate,
    p_marked_by_auth_user_id: session.authUserId,
    p_marks: marks.map((m) => ({ student_id: m.studentId, status: m.status, remarks: m.remarks ?? null })) as unknown as Json,
  });
  if (error) return { error: error.message };

  const result = data as unknown as { written: number; skipped_other_section: string[] };

  await writeAuditLog(session.schoolId, session.authUserId, "attendance.marked", sectionId, {
    sectionId,
    attendanceDate,
    written: result.written,
    skippedOtherSection: result.skipped_other_section,
  } as unknown as Json);

  // Best-effort per §E "parent alerts on absence" -- must never fail the primary mark itself.
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

  return result.skipped_other_section.length > 0 ? { skippedOtherSection: result.skipped_other_section } : {};
}
