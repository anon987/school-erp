import { z } from "zod";
import { supabase } from "../core/supabase/client";
import { isoDateSchema } from "../core/validation";
import type { GuardianSession } from "../core/auth/types";

export interface ActionResult {
  error?: string;
}

/**
 * Mirrors apps/web/src/lib/portal/actions.ts's submitLeaveApplicationAction. No "use server"
 * boundary here -- there is none on mobile -- so the RLS insert policy on
 * student_leave_application (school_id/guardian_id must match the caller) is the only
 * enforcement; this Zod parse is the friendly pre-check, same relationship as every other
 * action/RLS pair in this codebase.
 */
const leaveApplicationSchema = z
  .object({ fromDate: isoDateSchema, toDate: isoDateSchema, reason: z.string().trim().min(1, "Reason is required") })
  .refine((v) => v.toDate >= v.fromDate, { message: "End date must be on or after the start date", path: ["toDate"] });

export async function submitLeaveApplication(
  session: GuardianSession,
  studentId: string,
  input: { fromDate: string; toDate: string; reason: string },
): Promise<ActionResult> {
  const parsed = leaveApplicationSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { error } = await supabase.from("student_leave_application").insert({
    school_id: session.schoolId,
    student_id: studentId,
    guardian_id: session.guardianId,
    from_date: parsed.data.fromDate,
    to_date: parsed.data.toDate,
    reason: parsed.data.reason,
  });
  if (error) return { error: error.message };
  return {};
}
