import { z } from "zod";
import { isoDateSchema } from "@/lib/core/validation";

export const academicYearInputSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    startDate: isoDateSchema,
    endDate: isoDateSchema,
  })
  .refine((v) => v.endDate > v.startDate, { message: "End date must be after start date", path: ["endDate"] });

export const classInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
});

export const sectionInputSchema = z.object({
  classId: z.string().uuid("Choose a class"),
  name: z.string().trim().min(1, "Name is required"),
});

export const subjectInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  code: z.string().trim().optional(),
});

/** Department, designation, and house are all bare (school_id, name) rows -- one schema for all three. */
export const namedEntityInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
});

export const holidayInputSchema = z.object({
  date: isoDateSchema,
  name: z.string().trim().min(1, "Name is required"),
});

export const studentCategoryInputSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, "Key is required")
    .regex(/^[a-z0-9_]+$/, "Key must be lowercase letters, numbers, and underscores only"),
  label: z.string().trim().min(1, "Label is required"),
});

const percentageSchema = z.coerce.number().min(0, "Must be 0-100").max(100, "Must be 0-100");

export const admissionStageInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  stageType: z.enum(["in_progress", "admitted", "rejected", "withdrawn"]),
});

export const admissionDocumentTypeInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  isRequired: z.coerce.boolean(),
});

export const periodInputSchema = z
  .object({
    periodNumber: z.coerce.number().int().min(1),
    label: z.string().trim().min(1, "Label is required"),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
    isBreak: z.coerce.boolean(),
  })
  .refine((v) => v.endTime > v.startTime, { message: "End time must be after start time", path: ["endTime"] });

export const hpcCriterionInputSchema = z.object({
  category: z.enum(["co_curricular", "life_skill"]),
  name: z.string().trim().min(1, "Name is required"),
});

export const hpcRatingScaleInputSchema = z.object({
  code: z.string().trim().min(1, "Code is required"),
  label: z.string().trim().min(1, "Label is required"),
});

export const gradeBandInputSchema = z
  .object({
    minPercentage: percentageSchema,
    maxPercentage: percentageSchema,
    gradeLabel: z.string().trim().min(1, "Grade label is required"),
    gradePoint: z.coerce.number().min(0).max(10).optional(),
    remark: z.string().trim().optional(),
  })
  .refine((v) => v.minPercentage <= v.maxPercentage, { message: "Min % must not exceed max %", path: ["minPercentage"] });
