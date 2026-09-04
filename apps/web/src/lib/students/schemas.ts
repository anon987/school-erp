import { z } from "zod";
import { e164PhoneSchema, isoDateSchema } from "@/lib/core/validation";

const optionalOrEmpty = <T extends z.ZodTypeAny>(schema: T) => schema.optional().or(z.literal(""));

export const guardianInputSchema = z.object({
  firstName: z.string().trim().min(1),
  relationshipType: z.enum(["father", "mother", "guardian", "other"]),
  phone: optionalOrEmpty(e164PhoneSchema),
  email: optionalOrEmpty(z.string().trim().email()),
});
export type GuardianInput = z.infer<typeof guardianInputSchema>;

export const studentInputSchema = z.object({
  admissionNumber: z.string().trim().optional(), // blank -> auto-generated via fn_next_school_number
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  dob: optionalOrEmpty(isoDateSchema),
  gender: optionalOrEmpty(z.enum(["male", "female", "other"])),
  bloodGroup: z.string().trim().optional(),
  categoryId: optionalOrEmpty(z.string().uuid()),
  houseId: optionalOrEmpty(z.string().uuid()),
  classId: z.string().uuid("Select a class"),
  sectionId: z.string().uuid("Select a section"),
  rollNumber: z.string().trim().optional(),
  guardian1Name: z.string().trim().optional(),
  guardian1Relationship: optionalOrEmpty(z.enum(["father", "mother", "guardian", "other"])),
  guardian1Phone: optionalOrEmpty(e164PhoneSchema),
  guardian1Email: optionalOrEmpty(z.string().trim().email()),
  guardian2Name: z.string().trim().optional(),
  guardian2Relationship: optionalOrEmpty(z.enum(["father", "mother", "guardian", "other"])),
  guardian2Phone: optionalOrEmpty(e164PhoneSchema),
  guardian2Email: optionalOrEmpty(z.string().trim().email()),
});
export type StudentInput = z.infer<typeof studentInputSchema>;

export const updateStudentInputSchema = studentInputSchema.extend({
  id: z.string().uuid(),
});
export type UpdateStudentInput = z.infer<typeof updateStudentInputSchema>;
