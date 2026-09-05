import { z } from "zod";
import { e164PhoneSchema } from "@/lib/core/validation";

const optionalOrEmpty = <T extends z.ZodTypeAny>(schema: T) => schema.optional().or(z.literal(""));

// Standard 15-character GSTIN shape: 2-digit state code, 10-char PAN (5 letters/4 digits/1
// letter), 1-digit entity code, fixed 'Z', 1 alphanumeric checksum. Most schools have no GST
// registration (tuition is largely GST-exempt in India) so this stays optional -- it only
// matters when a school also bills taxable items (transport, hostel, canteen) on the same receipt.
const gstinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[A-Z0-9]$/, "Enter a valid 15-character GSTIN, or leave blank");

export const schoolProfileInputSchema = z.object({
  legalName: z.string().trim().min(1, "School name is required"),
  board: z.string().trim().optional(),
  address: z.string().trim().optional(),
  contactPhone: optionalOrEmpty(e164PhoneSchema),
  contactEmail: optionalOrEmpty(z.string().trim().email()),
  gstin: optionalOrEmpty(gstinSchema),
});
export type SchoolProfileInput = z.infer<typeof schoolProfileInputSchema>;
