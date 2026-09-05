import { supabase } from "../supabase/client";

/** Mirrors apps/web/src/lib/core/school/getCurrentAcademicYear.ts. */
export async function getCurrentAcademicYearId(schoolId: string): Promise<string | null> {
  const { data, error } = await supabase.from("academic_year").select("id").eq("school_id", schoolId).eq("is_current", true).maybeSingle();
  if (error) throw error;
  return (data as unknown as { id: string } | null)?.id ?? null;
}

export async function getCurrentAcademicYearName(schoolId: string): Promise<string | null> {
  const { data, error } = await supabase.from("academic_year").select("name").eq("school_id", schoolId).eq("is_current", true).maybeSingle();
  if (error) throw error;
  return (data as unknown as { name: string } | null)?.name ?? null;
}
