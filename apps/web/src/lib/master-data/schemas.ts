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

export const studentCategoryInputSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, "Key is required")
    .regex(/^[a-z0-9_]+$/, "Key must be lowercase letters, numbers, and underscores only"),
  label: z.string().trim().min(1, "Label is required"),
});
