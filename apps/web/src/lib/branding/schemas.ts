import { z } from "zod";

const optionalOrEmpty = <T extends z.ZodTypeAny>(schema: T) => schema.optional().or(z.literal(""));

export const brandingInputSchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required"),
  // Fallback path for a school that already hosts its logo elsewhere -- the file upload
  // (BrandingForm's "photo" field, handled separately in updateBrandingAction) takes priority
  // when both are present.
  logoUrl: optionalOrEmpty(z.string().trim().url("Enter a valid URL")),
  // Matches the school_branding.brand_color_hex check constraint (packages/db) -- 6-digit hex,
  // case-insensitive.
  brandColorHex: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Enter a colour as a 6-digit hex code, e.g. #1D4ED8"),
});
export type BrandingInput = z.infer<typeof brandingInputSchema>;
