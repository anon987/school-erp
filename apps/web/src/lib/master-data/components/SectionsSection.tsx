"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createSectionAction, deleteSectionAction, updateSectionAction, type MasterDataFormState } from "../actions";
import type { ClassWithSections } from "../types";
import { DeleteRowButton } from "@/components/DeleteRowButton";
import { EditableText } from "./EditableText";

const initialState: MasterDataFormState = {};

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary disabled:opacity-60"
    >
      Add
    </button>
  );
}

function ClassSections({ klass }: { klass: ClassWithSections }) {
  const [state, formAction] = useFormState(createSectionAction, initialState);

  return (
    <li className="flex flex-col gap-2 rounded-md border border-border p-3">
      <span className="font-medium">{klass.name}</span>
      <div className="flex flex-wrap gap-2">
        {klass.sections.map((s) => (
          <span key={s.id} className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-sm">
            <EditableText id={s.id} value={s.name} fieldName="name" updateAction={updateSectionAction} />
            <DeleteRowButton action={deleteSectionAction.bind(null, s.id)} />
          </span>
        ))}
        {klass.sections.length === 0 ? <span className="text-sm text-muted-foreground">No sections yet.</span> : null}
      </div>
      <form action={formAction} className="flex items-center gap-2">
        <input type="hidden" name="classId" value={klass.id} />
        <input
          name="name"
          required
          placeholder="e.g. A"
          className="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm"
        />
        <AddButton />
      </form>
      {state.error ? <p className="text-xs text-danger-solid">{state.error}</p> : null}
    </li>
  );
}

/**
 * Grouped by class, not a flat table with a class-picker per row -- matches how a clerk actually
 * thinks about it ("Class VI has sections A, B, C"), and section.class_id is not null (hard FK),
 * so there is nothing meaningful to show here until at least one class exists.
 */
export function SectionsSection({ classes }: { classes: ClassWithSections[] }) {
  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">3. Sections</h2>
        <p className="text-sm text-muted-foreground">Required before students can be enrolled in that class.</p>
      </div>

      {classes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Add at least one class above first.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {classes.map((klass) => (
            <ClassSections key={klass.id} klass={klass} />
          ))}
        </ul>
      )}
    </section>
  );
}
