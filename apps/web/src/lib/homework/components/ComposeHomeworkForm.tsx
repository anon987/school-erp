"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createHomeworkAction, type HomeworkFormState } from "../actions";
import type { StaffClassSubjectOption } from "../types";

const initialState: HomeworkFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
      Create (draft)
    </button>
  );
}

export function ComposeHomeworkForm({ options }: { options: StaffClassSubjectOption[] }) {
  const [state, formAction] = useFormState(createHomeworkAction, initialState);

  if (options.length === 0) {
    return <p className="text-sm text-muted-foreground">No class/subject assignments found for you this year -- ask an admin to assign you one first.</p>;
  }

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
      <label className="flex flex-col gap-1 text-sm">
        Class
        <select name="staffClassSubjectId" required defaultValue="" className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="" disabled>
            Select a class / subject
          </option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.className} {o.sectionName} -- {o.subjectName}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Title
        <input name="title" required className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Description
        <textarea name="description" required rows={3} className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Due date
        <input name="dueDate" type="date" required className="w-40 rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </label>
      <div>
        <SubmitButton />
        {state.error ? <p className="mt-2 text-sm text-danger-solid">{state.error}</p> : null}
      </div>
      <p className="text-xs text-muted-foreground">Saved as a draft first -- publish it from the list below once you&apos;re ready to notify students.</p>
    </form>
  );
}
