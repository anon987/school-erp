import { createSupabaseServerClient } from "../supabase/server";

/**
 * Every screen implicitly depends on "which year is this" (enrollment, attendance, fees are all
 * year-scoped) -- docs/design-system.md > Navigation requires this stay visible in the header on
 * every page, not something a user has to click to confirm.
 */
export async function getCurrentAcademicYearName(schoolId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("academic_year")
    .select("name")
    .eq("school_id", schoolId)
    .eq("is_current", true)
    .maybeSingle();

  if (error) throw error;
  return data?.name ?? null;
}

/** Same lookup, returning the id -- what every year-scoped query (enrollment, attendance) filters on. */
export async function getCurrentAcademicYearId(schoolId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("academic_year")
    .select("id")
    .eq("school_id", schoolId)
    .eq("is_current", true)
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as { id: string } | null)?.id ?? null;
}
