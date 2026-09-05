"use client";

import { useMemo } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { confirmImportMappingAction, type MappingState } from "../actions";
import { importFieldsFor, suggestMapping } from "../fields";
import type { ImportEntityType } from "../types";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Applying mapping and validating…" : "Confirm mapping and validate"}
    </button>
  );
}

/**
 * Shown instead of the summary/commit view whenever import_batch.status is still 'staged' --
 * see actions.ts's uploadImportAction/confirmImportMappingAction split. One row per target
 * field (docs/schoolerp_features.md's student/staff field list, from lib/core/import/fields.ts),
 * each a dropdown of the uploaded file's own headers -- pre-selected by suggestMapping's
 * best-effort guess, always school-confirmed before anything is validated against it.
 */
export function ColumnMappingForm({
  entityType,
  batchId,
  redirectBasePath,
  csvHeaders,
}: {
  entityType: ImportEntityType;
  batchId: string;
  redirectBasePath: string;
  csvHeaders: string[];
}) {
  const boundAction = confirmImportMappingAction.bind(null, entityType, batchId, redirectBasePath);
  const [state, formAction] = useFormState<MappingState, FormData>(boundAction, {});

  const fields = importFieldsFor(entityType);
  const suggested = useMemo(() => suggestMapping(entityType, csvHeaders), [entityType, csvHeaders]);

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4 rounded-md border border-border bg-card p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Match your columns</h2>
        <p className="text-sm text-muted-foreground">
          Your file&apos;s columns don&apos;t need to match our field names exactly -- pick which of your columns holds each piece of
          data below. We guessed where we could; check them before continuing.
        </p>
      </div>

      <div className="flex flex-col divide-y divide-border">
        {fields.map((field) => (
          <div key={field.key} className="flex items-center justify-between gap-3 py-2">
            <label htmlFor={`map_${field.key}`} className="text-sm">
              {field.label}
              {field.required ? null : <span className="text-muted-foreground"> (optional)</span>}
            </label>
            <select
              id={`map_${field.key}`}
              name={`map_${field.key}`}
              defaultValue={suggested[field.key] ?? ""}
              required={field.required}
              className="w-56 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">{field.required ? "-- Choose a column --" : "-- Not present in file --"}</option>
              {csvHeaders.map((header) => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {state.error ? (
        <p role="alert" className="rounded-md border border-border bg-danger px-3 py-2 text-sm text-danger-foreground shadow-sm">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
