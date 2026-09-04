"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createStudentCategoryAction, deleteStudentCategoryAction, updateStudentCategoryAction, type MasterDataFormState } from "../actions";
import type { StudentCategoryRow } from "../types";
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

export function StudentCategoriesSection({ categories }: { categories: StudentCategoryRow[] }) {
  const [state, formAction] = useFormState(createStudentCategoryAction, initialState);

  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Student Categories</h2>
        <p className="text-sm text-muted-foreground">Optional -- e.g. General, OBC, SC, ST, EWS. Used for fee concessions later.</p>
      </div>

      {categories.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-sm">
              {/* Only the label is editable -- key is the stable identifier import rows and
                  other references use, so it's fixed once created. */}
              <EditableText id={c.id} value={c.label} fieldName="label" updateAction={updateStudentCategoryAction} />
              <span className="font-figures text-xs text-muted-foreground">({c.key})</span>
              <DeleteRowButton action={deleteStudentCategoryAction.bind(null, c.id)} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">None yet.</p>
      )}

      <form action={formAction} className="flex items-end gap-2 pt-1">
        <input name="key" required placeholder="key (e.g. obc)" className="w-32 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <input name="label" required placeholder="Label (e.g. OBC)" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <AddButton />
      </form>
      {state.error ? <p className="text-sm text-danger-solid">{state.error}</p> : null}
    </section>
  );
}
