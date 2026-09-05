import { z } from "zod";
import { isoDateSchema } from "@/lib/core/validation";

export const createHomeworkInputSchema = z.object({
  staffClassSubjectId: z.string().uuid("Select a class and subject"),
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().min(1, "Description is required"),
  dueDate: isoDateSchema,
});
export type CreateHomeworkInput = z.infer<typeof createHomeworkInputSchema>;

export const reviewSubmissionInputSchema = z.object({
  teacherRemarks: z.string().trim().min(1, "Add a remark"),
});

export const submitHomeworkInputSchema = z.object({
  content: z.string().trim().optional(),
});
