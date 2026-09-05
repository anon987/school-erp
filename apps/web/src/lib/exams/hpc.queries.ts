import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import type { HpcData, HpcRatingRow } from "./types";

type CriterionRow = { id: string; category: "co_curricular" | "life_skill"; name: string };
type AssessmentRow = { criterion_id: string; rating_scale_id: string; remarks: string | null; rating_scale: { code: string; label: string } | null };

/**
 * Every configured hpc_criterion for the school, left-joined against this (setup, student)'s
 * existing hpc_assessment rows -- a criterion with no rating yet still gets a row (ratingScaleId
 * null), so both the printed card and the entry form always show every configured criterion, not
 * just the ones already rated.
 */
export async function getHpcDataForStudent(schoolId: string, setupId: string, studentId: string): Promise<HpcData> {
  const supabase = await createSupabaseServerClient();
  const [{ data: criteriaData, error: criteriaError }, { data: assessmentData, error: assessmentError }] = await Promise.all([
    supabase.from("hpc_criterion").select("id, category, name").eq("school_id", schoolId).order("category").order("sort_order"),
    supabase
      .from("hpc_assessment")
      .select("criterion_id, rating_scale_id, remarks, rating_scale:rating_scale_id(code, label)")
      .eq("school_id", schoolId)
      .eq("report_card_setup_id", setupId)
      .eq("student_id", studentId),
  ]);
  if (criteriaError) throw criteriaError;
  if (assessmentError) throw assessmentError;

  const criteria = (criteriaData ?? []) as unknown as CriterionRow[];
  const assessments = (assessmentData ?? []) as unknown as AssessmentRow[];
  const byCriterion = new Map(assessments.map((a) => [a.criterion_id, a]));

  const toRow = (c: CriterionRow): HpcRatingRow => {
    const a = byCriterion.get(c.id);
    return {
      criterionId: c.id,
      criterionName: c.name,
      ratingScaleId: a?.rating_scale_id ?? null,
      ratingCode: a?.rating_scale?.code ?? null,
      ratingLabel: a?.rating_scale?.label ?? null,
      remarks: a?.remarks ?? null,
    };
  };

  return {
    coCurricular: criteria.filter((c) => c.category === "co_curricular").map(toRow),
    lifeSkills: criteria.filter((c) => c.category === "life_skill").map(toRow),
  };
}

export async function getHpcRatingScaleOptions(schoolId: string): Promise<{ id: string; code: string; label: string }[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("hpc_rating_scale").select("id, code, label").eq("school_id", schoolId).order("sort_order");
  if (error) throw error;
  return (data ?? []) as unknown as { id: string; code: string; label: string }[];
}
