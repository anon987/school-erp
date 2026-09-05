import { z } from "zod";
import { e164PhoneSchema, isoDateSchema } from "@/lib/core/validation";

const optionalOrEmpty = <T extends z.ZodTypeAny>(schema: T) => schema.optional().or(z.literal(""));

export const enquiryInputSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().optional(),
  phone: optionalOrEmpty(e164PhoneSchema),
  email: optionalOrEmpty(z.string().trim().email()),
  classInterestedId: optionalOrEmpty(z.string().uuid()),
  source: z.enum(["walk_in", "referral", "phone", "website", "advertisement", "other"]),
  notes: z.string().trim().optional(),
});
export type EnquiryInput = z.infer<typeof enquiryInputSchema>;

export const applicationInputSchema = z.object({
  enquiryId: optionalOrEmpty(z.string().uuid()),
  academicYearId: z.string().uuid("Select an academic year"),
  applicantFirstName: z.string().trim().min(1, "First name is required"),
  applicantLastName: z.string().trim().min(1, "Last name is required"),
  dob: optionalOrEmpty(isoDateSchema),
  gender: optionalOrEmpty(z.enum(["male", "female", "other"])),
  categoryId: optionalOrEmpty(z.string().uuid()),
  classApplyingForId: z.string().uuid("Select a class"),
  guardianName: z.string().trim().optional(),
  guardianPhone: optionalOrEmpty(e164PhoneSchema),
  guardianEmail: optionalOrEmpty(z.string().trim().email()),
});
export type ApplicationInput = z.infer<typeof applicationInputSchema>;

export const stageEventInputSchema = z.object({
  stageId: z.string().uuid("Select a stage"),
  score: optionalOrEmpty(z.coerce.number().min(0)),
  notes: z.string().trim().optional(),
});
export type StageEventInput = z.infer<typeof stageEventInputSchema>;

export const confirmAdmissionInputSchema = z.object({
  sectionId: z.string().uuid("Select a section"),
});
export type ConfirmAdmissionInput = z.infer<typeof confirmAdmissionInputSchema>;
