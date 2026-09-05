"use client";

import { useFormState, useFormStatus } from "react-dom";
import { saveCustomFieldValuesAction, type CustomFieldFormState } from "../actions";
import type { CustomFieldDefinition, CustomFieldEntityType, CustomFieldValueMap } from "../types";

const initialState: CustomFieldFormState = {};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="self-start rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary disabled:opacity-60">
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

const inputClass = "rounded-md border border-input bg-background px-3 py-2 text-sm";

function FieldInput({ definition, value }: { definition: CustomFieldDefinition; value: string | null }) {
  const name = `value_${definition.id}`;
  switch (definition.fieldType) {
    case "boolean":
      return (
        <select name={name} defaultValue={value ?? ""} className={inputClass}>
          <option value="">—</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
    case "select":
      return (
        <select name={name} defaultValue={value ?? ""} className={inputClass}>
          <option value="">—</option>
          {(definition.selectOptions ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    case "date":
      return <input type="date" name={name} defaultValue={value ?? ""} className={inputClass} />;
    case "number":
      return <input type="number" name={name} defaultValue={value ?? ""} className={inputClass} />;
    case "text":
      return <input type="text" name={name} defaultValue={value ?? ""} className={inputClass} />;
  }
}

/**
 * Shown on a student/staff profile only when the school has defined at least one custom field for
 * that entity type -- schools with none configured see nothing here, not an empty section.
 */
export function CustomFieldsForm({
  entityType,
  entityId,
  definitions,
  values,
  canManage,
}: {
  entityType: CustomFieldEntityType;
  entityId: string;
  definitions: CustomFieldDefinition[];
  values: CustomFieldValueMap;
  canManage: boolean;
}) {
  const boundAction = saveCustomFieldValuesAction.bind(null, entityType, entityId);
  const [state, formAction] = useFormState(boundAction, initialState);

  if (definitions.length === 0) return null;

  if (!canManage) {
    return (
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        {definitions.map((d) => (
          <div key={d.id}>
            <span className="text-xs font-medium text-muted-foreground">{d.label}</span>
            <p className="text-sm">{values[d.id] ?? "—"}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {definitions.map((d) => (
          <label key={d.id} className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            {d.label}
            {d.isRequired ? <span className="text-danger-solid"> *</span> : null}
            <FieldInput definition={d} value={values[d.id] ?? null} />
          </label>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <SaveButton />
        {state.error ? <span className="text-sm text-danger-solid">{state.error}</span> : null}
      </div>
    </form>
  );
}
