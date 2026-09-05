import { z } from "zod";
import { isoDateSchema } from "@/lib/core/validation";

export const attendanceStatusSchema = z.enum(["present", "absent", "late", "half_day", "leave"]);

const attendanceMarkSchema = z.object({
  status: attendanceStatusSchema,
  remarks: z.string().trim().max(500).optional(),
});

export const markSectionAttendanceInputSchema = z.object({
  sectionId: z.string().uuid(),
  attendanceDate: isoDateSchema,
  marks: z
    .array(attendanceMarkSchema.extend({ studentId: z.string().uuid() }))
    .min(1, "Nothing to submit"),
});

export const markStaffAttendanceInputSchema = z.object({
  attendanceDate: isoDateSchema,
  marks: z
    .array(attendanceMarkSchema.extend({ staffId: z.string().uuid() }))
    .min(1, "Nothing to submit"),
});

export const attendanceThresholdInputSchema = z.object({
  thresholdPercent: z.number().min(0).max(100),
});
