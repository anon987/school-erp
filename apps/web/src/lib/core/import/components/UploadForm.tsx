"use client";

import { useFormState, useFormStatus } from "react-dom";
import { uploadImportAction, type UploadImportState } from "../actions";
import type { ImportEntityType, ImportMatchMode } from "../types";

const initialState: UploadImportState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Uploading…" : "Upload and validate"}
    </button>
  );
}

export function UploadForm({
  entityType,
  redirectBasePath,
  matchModeOptions,
  templateHref,
}: {
  entityType: ImportEntityType;
  redirectBasePath: string;
  matchModeOptions: { value: ImportMatchMode; label: string; hint: string }[];
  templateHref: string;
}) {
  const boundAction = uploadImportAction.bind(null, entityType, redirectBasePath);
  const [state, formAction] = useFormState(boundAction, initialState);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <a href={templateHref} download className="text-sm text-primary underline underline-offset-2">
        Download the CSV template
      </a>

      <div className="flex flex-col gap-1">
        <label htmlFor="file" className="text-sm font-medium">
          CSV file
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="rounded-md border border-input bg-background px-3 py-2 text-base"
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">How should rows be matched against existing records?</legend>
        {matchModeOptions.map((option, index) => (
          <label key={option.value} className="flex items-start gap-2 text-sm">
            <input type="radio" name="matchMode" value={option.value} defaultChecked={index === 0} className="mt-1" />
            <span>
              <span className="font-medium">{option.label}</span>
              <span className="block text-muted-foreground">{option.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isDryRun" />
        Dry run — validate only, this batch can never be committed
      </label>

      {state.error ? (
        <p role="alert" className="rounded-md bg-danger px-3 py-2 text-sm text-danger-foreground">
          {state.error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
