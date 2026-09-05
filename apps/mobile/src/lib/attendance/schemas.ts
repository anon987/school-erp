import { z } from "zod";
import { isoDateSchema } from "../core/validation";

/** Mirrors apps/web/src/lib/attendance/schemas.ts. */
export const attendanceStatusSchema = z.enum(["present", "absent", "late", "half_day", "leave"]);

const attendanceMarkSchema = z.object({
  status: attendanceStatusSchema,
  remarks: z.string().trim().max(500).optional(),
});

export const markSectionAttendanceInputSchema = z.object({
  sectionId: z.string().uuid(),
  attendanceDate: isoDateSchema,
  marks: z.array(attendanceMarkSchema.extend({ studentId: z.string().uuid() })).min(1, "Nothing to submit"),
});
