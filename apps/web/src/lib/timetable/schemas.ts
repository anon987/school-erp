import { z } from "zod";
import { isoDateSchema } from "@/lib/core/validation";

const optionalOrEmpty = <T extends z.ZodTypeAny>(schema: T) => schema.optional().or(z.literal(""));

export const timetableSlotInputSchema = z.object({
  classId: z.string().uuid(),
  sectionId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  dayOfWeek: z.coerce.number().int().min(1).max(7),
  periodId: z.string().uuid(),
  staffClassSubjectId: optionalOrEmpty(z.string().uuid()),
  room: optionalOrEmpty(z.string().trim()),
});
export type TimetableSlotInput = z.infer<typeof timetableSlotInputSchema>;

export const substitutionInputSchema = z.object({
  timetableSlotId: z.string().uuid(),
  substitutionDate: isoDateSchema,
  substituteStaffId: z.string().uuid("Select a substitute teacher"),
  reason: z.string().trim().optional(),
});
export type SubstitutionInput = z.infer<typeof substitutionInputSchema>;
