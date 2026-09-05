"use server";

import { revalidatePath } from "next/cache";
import { deriveBrandTokens } from "@schoolerp/ui";
import type { Json } from "@schoolerp/types";
import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import { getSession } from "@/lib/core/auth/session";
import { requirePermission } from "@/lib/core/auth/permissions";
import { brandingInputSchema } from "./schemas";

export interface BrandingFormState {
  error?: string;
  success?: boolean;
  adjustmentNote?: string | null;
}

const PAGE_PATH = "/settings/branding";

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function updateBrandingAction(
  _prevState: BrandingFormState,
  formData: FormData,
): Promise<BrandingFormState> {
  await requirePermission("school.manage_branding");
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const parsed = brandingInputSchema.safeParse({
    displayName: readField(formData, "displayName"),
    logoUrl: readField(formData, "logoUrl"),
    brandColorHex: readField(formData, "brandColorHex"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  // Contrast-clamp + derive the light/dark ramp now, at save time, so every subsequent request
  // reads the cached result (apps/web/src/app/(app)/layout.tsx) instead of recomputing it.
  const brandTokens = deriveBrandTokens(parsed.data.brandColorHex.toUpperCase());

  const supabase = await createSupabaseServerClient();

  // A chosen file wins over the pasted URL field -- same form, two ways to supply a logo. Path is
  // fixed per school ({school_id}/logo.{ext}) and overwritten with `upsert: true`, not one object
  // per upload: school_branding.logo_url stores a single current URL, not a history, so nothing
  // is gained keeping old logo files around (contrast this with `document`, which IS a
  // deliberate append-only log for student/staff photos -- see lib/core/documents).
  let logoUrl = parsed.data.logoUrl || null;
  const logoFile = formData.get("logoFile");
  if (logoFile instanceof File && logoFile.size > 0) {
    if (!logoFile.type.startsWith("image/")) return { error: "Logo must be an image file." };
    if (logoFile.size > 2 * 1024 * 1024) return { error: "Logo file is too large (max 2 MB)." };

    const extension = logoFile.name.includes(".") ? logoFile.name.split(".").pop() : "png";
    const storagePath = `${session.schoolId}/logo.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("school-logos")
      .upload(storagePath, logoFile, { contentType: logoFile.type, upsert: true });
    if (uploadError) return { error: uploadError.message };

    const { data: publicUrlData } = supabase.storage.from("school-logos").getPublicUrl(storagePath);
    // Cache-bust: the path is stable per school, so an unchanged URL would keep serving a
    // browser/CDN-cached copy of the OLD logo after a replace.
    logoUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;
  }

  const { error: upsertError } = await supabase
    .from("school_branding")
    .upsert(
      {
        school_id: session.schoolId,
        display_name: parsed.data.displayName,
        logo_url: logoUrl,
        brand_color_hex: parsed.data.brandColorHex.toUpperCase(),
        brand_ramp: brandTokens as unknown as Json,
      },
      { onConflict: "school_id" },
    );
  if (upsertError) return { error: upsertError.message };

  await supabase.from("audit_log").insert({
    school_id: session.schoolId,
    actor_auth_user_id: session.authUserId,
    action: "branding.updated",
    entity_type: "school_branding",
    entity_id: session.schoolId,
    metadata: { adjustment_note: brandTokens.adjustmentNote },
  });

  revalidatePath(PAGE_PATH);
  // Brand tokens render in the root authenticated shell, not just this settings page --
  // every route under (app) needs the refreshed <style> block on next navigation.
  revalidatePath("/", "layout");

  return { success: true, adjustmentNote: brandTokens.adjustmentNote };
}
