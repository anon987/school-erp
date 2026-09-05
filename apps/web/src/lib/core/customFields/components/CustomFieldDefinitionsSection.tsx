"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createCustomFieldDefinitionAction, type CustomFieldFormState } from "../actions";
import { CUSTOM_FIELD_TYPES, CUSTOM_FIELD_TYPE_LABELS, type CustomFieldDefinition, type CustomFieldEntityType, type CustomFieldType } from "../types";
import { DeleteDefinitionButton } from "./DeleteDefinitionButton";

const initialState: CustomFieldFormState = {};

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary disabled:opacity-60">
      Add
    </button>
  );
}

/**
 * Rendered once per entity type (Student / Staff) on the Master Data settings page. Add-and-delete
 * only, matching GradeBandsSection's precedent -- a wrong field is corrected by deleting and
 * re-adding, never edited in place, so there's no path where existing values disagree with a
 * changed field_type.
 */
export function CustomFieldDefinitionsSection({
  entityType,
  title,
  definitions,
}: {
  entityType: CustomFieldEntityType;
  title: string;
  definitions: CustomFieldDefinition[];
}) {
  const boundAction = createCustomFieldDefinitionAction.bind(null, entityType);
  const [state, formAction] = useFormState(boundAction, initialState);
  const [fieldType, setFieldType] = useState<CustomFieldType>("text");

  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">Extra fields shown on every {entityType}&apos;s profile, beyond the built-in ones.</p>
      </div>

      {definitions.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-1 pr-3 font-medium">Label</th>
              <th className="py-1 pr-3 font-medium">Key</th>
              <th className="py-1 pr-3 font-medium">Type</th>
              <th className="py-1 pr-3 font-medium">Required</th>
              <th className="py-1 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {definitions.map((d) => (
              <tr key={d.id} className="border-b border-border last:border-0">
                <td className="py-1.5 pr-3 font-medium">{d.label}</td>
                <td className="font-figures py-1.5 pr-3 text-muted-foreground">{d.fieldKey}</td>
                <td className="py-1.5 pr-3">
                  {CUSTOM_FIELD_TYPE_LABELS[d.fieldType]}
                  {d.fieldType === "select" && d.selectOptions ? (
                    <span className="ml-1 text-xs text-muted-foreground">({d.selectOptions.join(", ")})</span>
                  ) : null}
                </td>
                <td className="py-1.5 pr-3 text-muted-foreground">{d.isRequired ? "Yes" : "No"}</td>
                <td className="py-1.5 text-right">
                  <DeleteDefinitionButton id={d.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-muted-foreground">None yet.</p>
      )}

      <form action={formAction} className="flex flex-wrap items-end gap-2 pt-1">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Label
          <input name="label" required placeholder="e.g. Blood Donor Card No." className="w-48 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Key
          <input name="fieldKey" required placeholder="e.g. blood_donor_card_no" className="w-48 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Type
          <select
            name="fieldType"
            value={fieldType}
            onChange={(e) => setFieldType(e.target.value as CustomFieldType)}
            className="w-32 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {CUSTOM_FIELD_TYPES.map((t) => (
              <option key={t} value={t}>
                {CUSTOM_FIELD_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        {fieldType === "select" ? (
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Options (one per line)
            <textarea name="selectOptions" rows={2} placeholder={"Option A\nOption B"} className="w-48 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </label>
        ) : null}
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" name="isRequired" />
          Required
        </label>
        <AddButton />
      </form>
      {state.error ? <p className="text-sm text-danger-solid">{state.error}</p> : null}
    </section>
  );
}
