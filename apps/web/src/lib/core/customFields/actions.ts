"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import { getSession } from "@/lib/core/auth/session";
import { requirePermission } from "@/lib/core/auth/permissions";
import { customFieldDefinitionInputSchema, validateCustomFieldValue } from "./schemas";
import { getCustomFieldDefinitions } from "./queries";
import type { CustomFieldEntityType } from "./types";

export interface CustomFieldFormState {
  error?: string;
}

const DEFINITIONS_PAGE_PATH = "/settings/master-data";

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function profilePathFor(entityType: CustomFieldEntityType, entityId: string): string {
  return entityType === "student" ? `/people/students/${entityId}` : `/people/staff/${entityId}`;
}

function managePermissionFor(entityType: CustomFieldEntityType): string {
  return entityType === "student" ? "school.manage_students" : "school.manage_staff";
}

/**
 * Definitions are add-and-delete only, matching GradeBandsSection's precedent in this same
 * Master Data settings screen -- a wrong field is corrected by deleting and re-adding, not
 * edited in place, which avoids ever having to migrate existing values when a type changes.
 */
export async function createCustomFieldDefinitionAction(
  entityType: CustomFieldEntityType,
  _prevState: CustomFieldFormState,
  formData: FormData,
): Promise<CustomFieldFormState> {
  await requirePermission("school.manage_master_data");
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const parsed = customFieldDefinitionInputSchema.safeParse({
    entityType,
    fieldKey: readField(formData, "fieldKey"),
    label: readField(formData, "label"),
    fieldType: readField(formData, "fieldType"),
    selectOptions: readField(formData, "selectOptions"),
    isRequired: formData.get("isRequired") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  if (parsed.data.fieldType === "select") {
    const options = (parsed.data.selectOptions ?? "")
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean);
    if (options.length < 2) return { error: "A dropdown field needs at least 2 options, one per line." };
  }

  const supabase = await createSupabaseServerClient();
  const selectOptions =
    parsed.data.fieldType === "select"
      ? (parsed.data.selectOptions ?? "")
          .split("\n")
          .map((o) => o.trim())
          .filter(Boolean)
      : null;

  const { data, error } = await supabase
    .from("custom_field_definition")
    .insert({
      school_id: session.schoolId,
      entity_type: parsed.data.entityType,
      field_key: parsed.data.fieldKey,
      label: parsed.data.label,
      field_type: parsed.data.fieldType,
      select_options: selectOptions,
      is_required: parsed.data.isRequired,
    })
    .select("id")
    .single();
  if (error || !data) {
    if (error?.code === "23505") return { error: "A field with this key already exists for this record type." };
    return { error: error?.message ?? "Could not create field." };
  }

  await supabase.from("audit_log").insert({
    school_id: session.schoolId,
    actor_auth_user_id: session.authUserId,
    action: "custom_field_definition.created",
    entity_type: "custom_field_definition",
    entity_id: data.id,
    metadata: { forEntityType: parsed.data.entityType, fieldKey: parsed.data.fieldKey },
  });

  revalidatePath(DEFINITIONS_PAGE_PATH);
  return {};
}

export async function deleteCustomFieldDefinitionAction(id: string, _prevState: CustomFieldFormState, _formData: FormData): Promise<CustomFieldFormState> {
  await requirePermission("school.manage_master_data");
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("custom_field_definition").delete().eq("id", id).eq("school_id", session.schoolId);
  if (error) return { error: error.message };

  await supabase.from("audit_log").insert({
    school_id: session.schoolId,
    actor_auth_user_id: session.authUserId,
    action: "custom_field_definition.deleted",
    entity_type: "custom_field_definition",
    entity_id: id,
    metadata: {},
  });

  revalidatePath(DEFINITIONS_PAGE_PATH);
  return {};
}

/** One form covers every defined field for this entity at once -- field names are `value_<definitionId>`. */
export async function saveCustomFieldValuesAction(
  entityType: CustomFieldEntityType,
  entityId: string,
  _prevState: CustomFieldFormState,
  formData: FormData,
): Promise<CustomFieldFormState> {
  await requirePermission(managePermissionFor(entityType));
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const definitions = await getCustomFieldDefinitions(session.schoolId, entityType);
  if (definitions.length === 0) return {};

  const rows: { school_id: string; definition_id: string; entity_type: CustomFieldEntityType; entity_id: string; value: string | null }[] = [];
  for (const def of definitions) {
    const raw = readField(formData, `value_${def.id}`);
    const result = validateCustomFieldValue(def.fieldType, def.selectOptions, def.isRequired, raw);
    if (!result.ok) return { error: `${def.label}: ${result.error}` };
    rows.push({ school_id: session.schoolId, definition_id: def.id, entity_type: entityType, entity_id: entityId, value: result.value });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("custom_field_value").upsert(rows, { onConflict: "definition_id,entity_id" });
  if (error) return { error: error.message };

  await supabase.from("audit_log").insert({
    school_id: session.schoolId,
    actor_auth_user_id: session.authUserId,
    action: `${entityType}.custom_fields_updated`,
    entity_type: entityType,
    entity_id: entityId,
    metadata: {},
  });

  revalidatePath(profilePathFor(entityType, entityId));
  return {};
}
