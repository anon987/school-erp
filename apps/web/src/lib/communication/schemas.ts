import { z } from "zod";

const optionalOrEmpty = <T extends z.ZodTypeAny>(schema: T) => schema.optional().or(z.literal(""));

export const composeNoticeSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  body: z.string().trim().min(1, "Message is required"),
  audienceKind: z.enum(["guardians", "staff"]),
  channels: z.array(z.enum(["in_app", "sms", "whatsapp", "email"])).min(1, "Select at least one channel"),
  scopeType: z.enum(["whole_school", "class", "section", "role", "individual"]),
  scopeId: optionalOrEmpty(z.string().uuid()),
  individualCode: optionalOrEmpty(z.string().trim()),
});
export type ComposeNoticeInput = z.infer<typeof composeNoticeSchema>;
