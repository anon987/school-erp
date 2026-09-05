export type CustomFieldEntityType = "student" | "staff";
export const CUSTOM_FIELD_TYPES = ["text", "number", "date", "boolean", "select"] as const;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export const CUSTOM_FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "Text",
  number: "Number",
  date: "Date",
  boolean: "Yes/No",
  select: "Dropdown",
};

export interface CustomFieldDefinition {
  id: string;
  entityType: CustomFieldEntityType;
  fieldKey: string;
  label: string;
  fieldType: CustomFieldType;
  selectOptions: string[] | null;
  isRequired: boolean;
  sortOrder: number;
}

/** One entity's current values, keyed by definition id -- absent key means "not yet filled in". */
export type CustomFieldValueMap = Record<string, string | null>;
