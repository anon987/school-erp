import { z } from "zod";
import { CUSTOM_FIELD_TYPES } from "./types";

export const customFieldDefinitionInputSchema = z.object({
  entityType: z.enum(["student", "staff"]),
  fieldKey: z
    .string()
    .trim()
    .min(1, "Key is required")
    .regex(/^[a-z0-9_]+$/, "Key must be lowercase letters, numbers, and underscores only"),
  label: z.string().trim().min(1, "Label is required"),
  fieldType: z.enum(CUSTOM_FIELD_TYPES),
  // Newline-separated in the form UI, split into an array here. Only meaningful for "select".
  selectOptions: z.string().trim().optional(),
  isRequired: z.boolean().default(false),
});
export type CustomFieldDefinitionInput = z.infer<typeof customFieldDefinitionInputSchema>;

/**
 * A definition's value column is untyped text (see the migration comment), so each submitted
 * value is validated against its own definition's field_type here, at the one place values are
 * ever written -- the boundary-validates-everything rule CLAUDE.md states for every other input,
 * applied to a schema that can't express per-row types itself.
 */
export function validateCustomFieldValue(
  fieldType: (typeof CUSTOM_FIELD_TYPES)[number],
  selectOptions: string[] | null,
  isRequired: boolean,
  raw: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    if (isRequired) return { ok: false, error: "This field is required." };
    return { ok: true, value: null };
  }

  switch (fieldType) {
    case "text":
      return { ok: true, value: trimmed };
    case "number":
      return Number.isFinite(Number(trimmed)) ? { ok: true, value: trimmed } : { ok: false, error: "Must be a number." };
    case "date":
      return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? { ok: true, value: trimmed } : { ok: false, error: "Must be a valid date." };
    case "boolean":
      return trimmed === "true" || trimmed === "false" ? { ok: true, value: trimmed } : { ok: false, error: "Invalid value." };
    case "select":
      return (selectOptions ?? []).includes(trimmed) ? { ok: true, value: trimmed } : { ok: false, error: "Not one of the configured options." };
  }
}
