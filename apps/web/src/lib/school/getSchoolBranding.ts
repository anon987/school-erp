import { createSupabaseServerClient } from "../supabase/server";

export interface SchoolBrandingRecord {
  displayName: string;
  logoUrl: string | null;
  brandColorHex: string;
}

// TODO(types): replace with the generated Row type for school_branding once
// packages/types/src/database.ts is regenerated. See that file's header.
interface SchoolBrandingRow {
  display_name: string;
  logo_url: string | null;
  brand_color_hex: string;
}

export async function getSchoolBranding(schoolId: string): Promise<SchoolBrandingRecord | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("school_branding")
    .select("display_name, logo_url, brand_color_hex")
    .eq("school_id", schoolId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as SchoolBrandingRow;
  return {
    displayName: row.display_name,
    logoUrl: row.logo_url,
    brandColorHex: row.brand_color_hex,
  };
}
