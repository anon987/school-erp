"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { MasterDataFormState } from "../actions";
import type { NamedRow } from "../types";
import { DeleteRowButton } from "./DeleteRowButton";
import { EditableText } from "./EditableText";

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
 * add/edit/delete behaviour -- one list component parameterised by title/actions, not three
 * near-identical ones.
 *
 * deleteAction takes the raw (id, prevState, formData) => State action, not a pre-bound one --
 * this component does the `.bind(null, row.id)` itself, at render time, inside the Client
 * Component. Passing a bound-per-row closure as the PROP VALUE from the Server Component page
 * doesn't work: a plain arrow function like `(id) => deleteXAction.bind(null, id)` is not a
 * Server Action reference, just a regular closure, and React Server Components can't serialize
 * that across the server->client boundary ("Functions cannot be passed directly to Client
 * Components"). The raw action itself IS a Server Action reference (actions.ts is "use server")
 * and crosses fine; binding it to an id has to happen on this side of the boundary.
 */
export function NamedListSection({
  title,
  rows,
  createAction,
  updateAction,
  deleteAction,
  placeholder,
}: {
  title: string;
  rows: NamedRow[];
  createAction: (prevState: MasterDataFormState, formData: FormData) => Promise<MasterDataFormState>;
  updateAction: (id: string, prevState: MasterDataFormState, formData: FormData) => Promise<MasterDataFormState>;
  deleteAction: (id: string, prevState: MasterDataFormState, formData: FormData) => Promise<MasterDataFormState>;
  placeholder: string;
}) {
  const [state, formAction] = useFormState(createAction, initialState);

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-4 shadow-sm">
      <h3 className="text-lg font-semibold">{title}</h3>
      {rows.length > 0 ? (
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between py-1 text-sm">
              <EditableText id={row.id} value={row.name} fieldName="name" updateAction={updateAction} />
              <DeleteRowButton action={deleteAction.bind(null, row.id)} />
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
