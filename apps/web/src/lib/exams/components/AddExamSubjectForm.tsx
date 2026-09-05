"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createExamSubjectAction, type ExamsFormState } from "../actions";

const initialState: ExamsFormState = {};

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Adding…" : "Add subject"}
    </button>
  );
}

export function AddExamSubjectForm({
  examId,
  classes,
  subjects,
}: {
  examId: string;
  classes: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
}) {
  const boundAction = createExamSubjectAction.bind(null, examId);
  const [state, formAction] = useFormState(boundAction, initialState);
  const [hasInternal, setHasInternal] = useState(false);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-card p-3 shadow-sm">
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Class
        <select name="classId" required className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">Select…</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Subject
        <select name="subjectId" required className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">Select…</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Max marks
        <input name="maxMarks" type="number" min={1} step="0.5" required className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Pass marks
        <input name="passMarks" type="number" min={0} step="0.5" required className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </label>
      <label className="flex items-center gap-2 pb-2 text-sm">
        <input type="checkbox" name="hasInternal" checked={hasInternal} onChange={(e) => setHasInternal(e.target.checked)} />
        Has internal component
      </label>
      {hasInternal ? (
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Internal max
          <input name="internalMaxMarks" type="number" min={0} step="0.5" required className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </label>
      ) : null}
      <AddButton />
      {state.error ? <p className="w-full text-sm text-danger-solid">{state.error}</p> : null}
    </form>
  );
}
