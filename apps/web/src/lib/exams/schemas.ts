import { z } from "zod";
import { isoDateSchema } from "@/lib/core/validation";

export const examInputSchema = z.object({
  academicYearId: z.string().uuid("Choose an academic year"),
  name: z.string().trim().min(1, "Name is required"),
  term: z.string().trim().optional(),
  startDate: isoDateSchema.optional().or(z.literal("")),
  endDate: isoDateSchema.optional().or(z.literal("")),
  computeRanks: z.boolean().default(false),
});

export const examSubjectInputSchema = z
  .object({
    classId: z.string().uuid("Choose a class"),
    subjectId: z.string().uuid("Choose a subject"),
    maxMarks: z.coerce.number().positive("Must be greater than 0"),
    passMarks: z.coerce.number().min(0, "Must be 0 or more"),
    hasInternal: z.boolean().default(false),
    internalMaxMarks: z.coerce.number().min(0).optional(),
  })
  .refine((v) => v.passMarks <= v.maxMarks, { message: "Pass marks can't exceed max marks", path: ["passMarks"] })
  .refine((v) => !v.hasInternal || (v.internalMaxMarks !== undefined && v.internalMaxMarks <= v.maxMarks), {
    message: "Internal max marks is required and can't exceed max marks",
    path: ["internalMaxMarks"],
  });

const markEntrySchema = z.object({
  studentId: z.string().uuid(),
  marksObtained: z.coerce.number().min(0).optional(),
  internalMarksObtained: z.coerce.number().min(0).optional(),
  isAbsent: z.boolean().default(false),
  remarks: z.string().trim().optional(),
});

export const saveMarksInputSchema = z.object({
  examSubjectId: z.string().uuid(),
  marks: z.array(markEntrySchema),
});
