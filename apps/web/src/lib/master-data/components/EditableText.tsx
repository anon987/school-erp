"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Pencil } from "lucide-react";
import type { MasterDataFormState } from "../actions";

const initialState: MasterDataFormState = {};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
    >
      Save
    </button>
  );
}

/**
 * docs/design-system.md > Forms > Inline-editable tables: clicking a value turns it into an
 * input in place; Enter/blur saves, Escape cancels. One component for every master-data entity
 * that only ever edits a single text field (class/section/department/designation/house name,
 * subject name is handled separately since it also has a code field, student_category label).
 */
export function EditableText({
  id,
  value,
  fieldName,
  updateAction,
}: {
  id: string;
  value: string;
  fieldName: string;
  updateAction: (id: string, prevState: MasterDataFormState, formData: FormData) => Promise<MasterDataFormState>;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useFormState(updateAction.bind(null, id), initialState);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (submittedRef.current && !state.error) setEditing(false);
  }, [state]);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="group flex items-center gap-1.5 rounded px-1 py-0.5 text-left hover:bg-secondary"
      >
        <span>{value}</span>
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" aria-hidden="true" />
      </button>
    );
  }

  return (
    <form
      action={(formData) => {
        submittedRef.current = true;
        formAction(formData);
      }}
      className="flex items-center gap-1"
    >
      <input
        name={fieldName}
        defaultValue={value}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Escape") setEditing(false);
        }}
        className="rounded-md border border-input bg-background px-2 py-1 text-sm"
      />
      <SaveButton />
      <button type="button" onClick={() => setEditing(false)} className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-secondary">
        Cancel
      </button>
      {state.error ? <span className="text-xs text-danger-solid">{state.error}</span> : null}
    </form>
  );
}
