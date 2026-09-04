"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Pencil } from "lucide-react";
import { createSubjectAction, deleteSubjectAction, updateSubjectAction, type MasterDataFormState } from "../actions";
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

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:opacity-90">
      Save
    </button>
  );
}

// Subject needs name + code edited together -- EditableText only covers a single field, so this
// gets its own small inline-edit form rather than forcing a two-field case through a
// one-field-shaped shared component.
function SubjectRowItem({ subject }: { subject: SubjectRow }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useFormState(updateSubjectAction.bind(null, subject.id), initialState);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (submittedRef.current && !state.error) setEditing(false);
  }, [state]);

  if (editing) {
    return (
      <li className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-sm">
        <form
          action={(fd) => {
            submittedRef.current = true;
            formAction(fd);
          }}
          className="flex items-center gap-1"
        >
          <input name="name" defaultValue={subject.name} autoFocus className="w-28 rounded-md border border-input bg-background px-2 py-1 text-sm" />
          <input name="code" defaultValue={subject.code ?? ""} placeholder="Code" className="w-16 rounded-md border border-input bg-background px-2 py-1 text-sm" />
          <SaveButton />
          <button type="button" onClick={() => setEditing(false)} className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-secondary">
            Cancel
          </button>
          {state.error ? <span className="text-xs text-danger-solid">{state.error}</span> : null}
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-sm">
      <button type="button" onClick={() => setEditing(true)} className="group flex items-center gap-1.5 rounded px-1 py-0.5 hover:bg-secondary">
        <span>
          {subject.name}
          {subject.code ? <span className="text-muted-foreground"> ({subject.code})</span> : null}
        </span>
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" aria-hidden="true" />
      </button>
      <DeleteRowButton action={deleteSubjectAction.bind(null, subject.id)} />
    </li>
  );
}

export function SubjectsSection({ subjects }: { subjects: SubjectRow[] }) {
  const [state, formAction] = useFormState(createSubjectAction, initialState);

  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Subjects</h2>
        <p className="text-sm text-muted-foreground">Optional now -- needed for the class-subject mapping below and later for marks entry.</p>
      </div>

      {subjects.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {subjects.map((s) => (
            <SubjectRowItem key={s.id} subject={s} />
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
