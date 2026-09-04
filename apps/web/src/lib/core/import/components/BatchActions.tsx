"use client";

import { Check, Undo2 } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";
import { commitImportBatchAction, revertImportBatchAction, type CommitState, type RevertState } from "../actions";
import type { ImportEntityType } from "../types";

function CommitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <Check className="h-4 w-4" aria-hidden="true" />
      {pending ? "Committing… this can take a little while for large files" : "Commit this import"}
    </button>
  );
}

export function CommitButtonForm({
  entityType,
  batchId,
  redirectBasePath,
}: {
  entityType: ImportEntityType;
  batchId: string;
  redirectBasePath: string;
}) {
  const boundAction = commitImportBatchAction.bind(null, entityType, batchId, redirectBasePath);
  const [state, formAction] = useFormState<CommitState, FormData>(boundAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <CommitButton />
      {state.error ? (
        <p role="alert" className="rounded-md bg-danger px-3 py-2 text-sm text-danger-foreground">
          {state.error}
        </p>
      ) : null}
      {state.done ? (
        <p className="rounded-md bg-success px-3 py-2 text-sm text-success-foreground">Import committed.</p>
      ) : null}
    </form>
  );
}

function RevertButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-2 rounded-md border border-danger-solid px-4 py-2 text-sm font-medium text-danger-solid hover:bg-danger disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <Undo2 className="h-4 w-4" aria-hidden="true" />
      {pending ? "Checking…" : "Revert this import"}
    </button>
  );
}

export function RevertButtonForm({
  entityType,
  batchId,
  redirectBasePath,
}: {
  entityType: ImportEntityType;
  batchId: string;
  redirectBasePath: string;
}) {
  const boundAction = revertImportBatchAction.bind(null, entityType, batchId, redirectBasePath);
  const [state, formAction] = useFormState<RevertState, FormData>(boundAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <RevertButton />
      {state.error ? (
        <p role="alert" className="rounded-md bg-danger px-3 py-2 text-sm text-danger-foreground">
          {state.error}
        </p>
      ) : null}
      {state.result && !state.result.reverted ? (
        <div className="rounded-md border border-warning-solid bg-warning px-3 py-2 text-sm text-warning-foreground">
          <p className="mb-1 font-medium">Revert blocked -- nothing was changed.</p>
          <ul className="list-inside list-disc">
            {state.result.blockers.map((b, i) => (
              <li key={i}>
                {b.row_number ? `Row ${b.row_number}: ` : b.guardian_id ? `Guardian: ` : ""}
                {b.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {state.result?.reverted ? (
        <p className="rounded-md bg-success px-3 py-2 text-sm text-success-foreground">
          Reverted. Records this batch created have been removed; updated records were restored to their prior values.
        </p>
      ) : null}
    </form>
  );
}
