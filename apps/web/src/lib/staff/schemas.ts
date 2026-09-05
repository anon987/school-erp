import { z } from "zod";
import { e164PhoneSchema, isoDateSchema } from "@/lib/core/validation";

const optionalOrEmpty = <T extends z.ZodTypeAny>(schema: T) => schema.optional().or(z.literal(""));

export const staffInputSchema = z.object({
  employeeCode: z.string().trim().optional(), // blank -> auto-generated via fn_next_school_number
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  dob: optionalOrEmpty(isoDateSchema),
  gender: optionalOrEmpty(z.enum(["male", "female", "other"])),
  phone: optionalOrEmpty(e164PhoneSchema),
  email: optionalOrEmpty(z.string().trim().email()),
  joiningDate: isoDateSchema,
  employmentStatus: z.enum(["active", "inactive"]),
  departmentId: optionalOrEmpty(z.string().uuid()),
  designationId: optionalOrEmpty(z.string().uuid()),
});
export type StaffInput = z.infer<typeof staffInputSchema>;

export const updateStaffInputSchema = staffInputSchema.extend({
  id: z.string().uuid(),
});

export const qualificationInputSchema = z.object({
  staffId: z.string().uuid(),
  degree: z.string().trim().min(1, "Required"),
  institution: z.string().trim().optional(),
  yearCompleted: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^\d{4}$/.test(v), "Enter a 4-digit year"),
});

export const staffAssignmentInputSchema = z.object({
  staffId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  classId: z.string().uuid("Choose a class"),
  sectionId: z.string().uuid("Choose a section"),
  subjectId: z.string().uuid("Choose a subject"),
});

export const leaveTypeInputSchema = z.object({
  name: z.string().trim().min(1, "Required"),
  isPaid: z.boolean().default(true),
});

export const leaveRequestInputSchema = z
  .object({
    staffId: z.string().uuid(),
    leaveTypeId: z.string().uuid("Choose a leave type"),
    startDate: isoDateSchema,
    endDate: isoDateSchema,
    reason: z.string().trim().optional(),
  })
  .refine((v) => v.endDate >= v.startDate, { message: "End date can't be before start date", path: ["endDate"] });
