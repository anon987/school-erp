"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import { getSession } from "@/lib/core/auth/session";
import { requirePermission } from "@/lib/core/auth/permissions";

export interface HpcFormState {
  error?: string;
}

const MANAGE = "school.manage_exams";

/**
 * Full replace per submit, same trade-off as updateClassSubjectMappingAction (master-data): a
 * rating carries no data worth diffing against (just a scale pick + a remark, both re-submitted
 * fresh from the form every time), so delete-then-reinsert is simpler than reconciling individual
 * rows. `criterionId` values come from hidden inputs the entry form renders for every configured
 * hpc_criterion -- a criterion left blank (no rating_scale_id chosen) is simply not re-inserted,
 * which is how a teacher clears a previously-saved rating.
 */
export async function saveHpcAssessmentsAction(
  setupId: string,
  studentId: string,
  classId: string,
  _prevState: HpcFormState,
  formData: FormData,
): Promise<HpcFormState> {
  await requirePermission(MANAGE);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };
  const schoolId = session.schoolId;

  const criterionIds = formData.getAll("criterionId").map(String);
  const rows: { criterion_id: string; rating_scale_id: string; remarks: string | null }[] = [];
  for (const criterionId of criterionIds) {
    const ratingScaleId = String(formData.get(`rating_${criterionId}`) ?? "");
    if (!ratingScaleId) continue;
    const remarks = String(formData.get(`remarks_${criterionId}`) ?? "").trim();
    rows.push({ criterion_id: criterionId, rating_scale_id: ratingScaleId, remarks: remarks || null });
  }

  const supabase = await createSupabaseServerClient();
  const { error: deleteError } = await supabase
    .from("hpc_assessment")
    .delete()
    .eq("school_id", schoolId)
    .eq("report_card_setup_id", setupId)
    .eq("student_id", studentId);
  if (deleteError) return { error: deleteError.message };

  if (rows.length > 0) {
    const { error: insertError } = await supabase.from("hpc_assessment").insert(
      rows.map((r) => ({
        school_id: schoolId,
        report_card_setup_id: setupId,
        student_id: studentId,
        criterion_id: r.criterion_id,
        rating_scale_id: r.rating_scale_id,
        remarks: r.remarks,
        entered_by_auth_user_id: session.authUserId,
      })),
    );
    if (insertError) return { error: insertError.message };
  }

  revalidatePath(`/academics/exams/report-card-setups/${setupId}/${classId}/${studentId}`);
  return {};
}
