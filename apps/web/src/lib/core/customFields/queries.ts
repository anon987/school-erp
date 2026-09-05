import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import type { CustomFieldDefinition, CustomFieldEntityType, CustomFieldType, CustomFieldValueMap } from "./types";

interface DefinitionRow {
  id: string;
  entity_type: CustomFieldEntityType;
  field_key: string;
  label: string;
  field_type: CustomFieldType;
  select_options: string[] | null;
  is_required: boolean;
  sort_order: number;
}

function toDefinition(row: DefinitionRow): CustomFieldDefinition {
  return {
    id: row.id,
    entityType: row.entity_type,
    fieldKey: row.field_key,
    label: row.label,
    fieldType: row.field_type,
    selectOptions: row.select_options,
    isRequired: row.is_required,
    sortOrder: row.sort_order,
  };
}

export async function getCustomFieldDefinitions(schoolId: string, entityType: CustomFieldEntityType): Promise<CustomFieldDefinition[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("custom_field_definition")
    .select("id, entity_type, field_key, label, field_type, select_options, is_required, sort_order")
    .eq("school_id", schoolId)
    .eq("entity_type", entityType)
    .order("sort_order")
    .order("label");
  if (error) throw error;
  return ((data ?? []) as unknown as DefinitionRow[]).map(toDefinition);
}

export async function getCustomFieldValues(schoolId: string, entityType: CustomFieldEntityType, entityId: string): Promise<CustomFieldValueMap> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("custom_field_value")
    .select("definition_id, value")
    .eq("school_id", schoolId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);
  if (error) throw error;

  const map: CustomFieldValueMap = {};
  for (const row of (data ?? []) as unknown as { definition_id: string; value: string | null }[]) {
    map[row.definition_id] = row.value;
  }
  return map;
}
