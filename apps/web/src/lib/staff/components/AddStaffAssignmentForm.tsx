"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createStaffAssignmentAction, type AssignmentFormState } from "../actions";
import type { AssignmentFormOptions } from "../types";

const initialState: AssignmentFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary disabled:opacity-60">
      {pending ? "Adding…" : "Add"}
    </button>
  );
}

export function AddStaffAssignmentForm({ staffId, academicYearId, options }: { staffId: string; academicYearId: string; options: AssignmentFormOptions }) {
  const [state, formAction] = useFormState(createStaffAssignmentAction, initialState);
  const [classId, setClassId] = useState("");
  const sections = options.sections.filter((s) => s.classId === classId);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="staffId" value={staffId} />
      <input type="hidden" name="academicYearId" value={academicYearId} />
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Class
        <select name="classId" value={classId} onChange={(e) => setClassId(e.target.value)} required className="w-36 rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">Select…</option>
          {options.classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Section
        <select name="sectionId" required disabled={!classId} className="w-32 rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60">
          <option value="">Select…</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Subject
        <select name="subjectId" required className="w-40 rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">Select…</option>
          {options.subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <SubmitButton />
      {state.error ? <p className="text-sm text-danger-solid">{state.error}</p> : null}
    </form>
  );
}
