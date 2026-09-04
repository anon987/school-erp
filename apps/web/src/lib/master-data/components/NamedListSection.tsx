"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { MasterDataFormState } from "../actions";
import type { NamedRow } from "../types";
import { DeleteRowButton } from "./DeleteRowButton";

const initialState: MasterDataFormState = {};

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary disabled:opacity-60"
    >
      Add
    </button>
  );
}

/**
 * Department, designation, and house are all bare (school_id, name) rows with identical
 * add/delete behaviour -- one list component parameterised by title/action, not three
 * near-identical ones.
 */
export function NamedListSection({
  title,
  rows,
  createAction,
  deleteAction,
  placeholder,
}: {
  title: string;
  rows: NamedRow[];
  createAction: (prevState: MasterDataFormState, formData: FormData) => Promise<MasterDataFormState>;
  deleteAction: (id: string) => (prevState: MasterDataFormState, formData: FormData) => Promise<MasterDataFormState>;
  placeholder: string;
}) {
  const [state, formAction] = useFormState(createAction, initialState);

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-4">
      <h3 className="font-medium">{title}</h3>
      {rows.length > 0 ? (
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between py-1.5 text-sm">
              <span>{row.name}</span>
              <DeleteRowButton action={deleteAction(row.id)} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">None yet.</p>
      )}
      <form action={formAction} className="flex items-end gap-2 pt-1">
        <input
          name="name"
          required
          placeholder={placeholder}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <AddButton />
      </form>
      {state.error ? <p className="text-sm text-danger-solid">{state.error}</p> : null}
    </div>
  );
}
