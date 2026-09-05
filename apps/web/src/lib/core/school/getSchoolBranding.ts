import type { BrandTokens } from "@schoolerp/ui";
import { createSupabaseServerClient } from "../supabase/server";
import { DEFAULT_RECEIPT_TEMPLATE, type ReceiptTemplateKey } from "@/lib/fees/receiptTemplates";

export interface SchoolBrandingRecord {
  displayName: string;
  logoUrl: string | null;
  brandColorHex: string;
  brandRamp: BrandTokens | null;
  receiptTemplate: ReceiptTemplateKey;
  receiptWatermarkEnabled: boolean;
}

// TODO(types): replace with the generated Row type for school_branding once
// packages/types/src/database.ts is regenerated. See that file's header.
interface SchoolBrandingRow {
  display_name: string;
  logo_url: string | null;
  brand_color_hex: string;
  brand_ramp: BrandTokens | null;
  receipt_template: string;
  receipt_watermark_enabled: boolean;
}

export async function getSchoolBranding(schoolId: string): Promise<SchoolBrandingRecord | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("school_branding")
    .select("display_name, logo_url, brand_color_hex, brand_ramp, receipt_template, receipt_watermark_enabled")
    .eq("school_id", schoolId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as SchoolBrandingRow;
  return {
    displayName: row.display_name,
    logoUrl: row.logo_url,
    brandColorHex: row.brand_color_hex,
    brandRamp: row.brand_ramp,
    receiptTemplate: (row.receipt_template as ReceiptTemplateKey) || DEFAULT_RECEIPT_TEMPLATE,
    receiptWatermarkEnabled: row.receipt_watermark_enabled,
  };
}
