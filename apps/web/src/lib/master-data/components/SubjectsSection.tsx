"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createSubjectAction, deleteSubjectAction, type MasterDataFormState } from "../actions";
import type { SubjectRow } from "../types";
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

export function SubjectsSection({ subjects }: { subjects: SubjectRow[] }) {
  const [state, formAction] = useFormState(createSubjectAction, initialState);

  return (
    <section className="flex flex-col gap-3 rounded-md border border-border p-4">
      <div>
        <h2 className="text-lg font-semibold">Subjects</h2>
        <p className="text-sm text-muted-foreground">Optional now -- needed for the class-subject mapping below and later for marks entry.</p>
      </div>

      {subjects.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {subjects.map((s) => (
            <li key={s.id} className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-sm">
              <span>
                {s.name}
                {s.code ? <span className="text-muted-foreground"> ({s.code})</span> : null}
              </span>
              <DeleteRowButton action={deleteSubjectAction.bind(null, s.id)} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">None yet.</p>
      )}

      <form action={formAction} className="flex items-end gap-2 pt-1">
        <input name="name" required placeholder="e.g. Mathematics" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <input name="code" placeholder="Code (optional)" className="w-32 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <AddButton />
      </form>
      {state.error ? <p className="text-sm text-danger-solid">{state.error}</p> : null}
    </section>
  );
}
