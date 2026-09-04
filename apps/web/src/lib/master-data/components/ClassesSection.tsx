"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createClassAction, deleteClassAction, updateClassAction, type MasterDataFormState } from "../actions";
import type { ClassRow } from "../types";
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
      Add class
    </button>
  );
}

export function ClassesSection({ classes }: { classes: ClassRow[] }) {
  const [state, formAction] = useFormState(createClassAction, initialState);

  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">2. Classes</h2>
        <p className="text-sm text-muted-foreground">
          Add every class the school runs, in order (e.g. Nursery, LKG, UKG, I ... XII). Required before Sections.
        </p>
      </div>

      {classes.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {classes.map((c) => (
            <li key={c.id} className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-sm">
              <EditableText id={c.id} value={c.name} fieldName="name" updateAction={updateClassAction} />
              <DeleteRowButton action={deleteClassAction.bind(null, c.id)} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No classes yet.</p>
      )}

      <form action={formAction} className="flex items-end gap-2 pt-1">
        <input
          name="name"
          required
          placeholder="e.g. VI or XI Science"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <AddButton />
      </form>
      {state.error ? <p className="text-sm text-danger-solid">{state.error}</p> : null}
    </section>
  );
}
