"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createExamAction, type ExamsFormState } from "../actions";

const initialState: ExamsFormState = {};

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="self-start rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Creating…" : "Create exam"}
    </button>
  );
}

export function CreateExamForm({ academicYearId, classes }: { academicYearId: string; classes: { id: string; name: string }[] }) {
  const [state, formAction] = useFormState(createExamAction, initialState);
  const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set());

  function toggleClass(id: string) {
    setSelectedClassIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-md border border-border bg-card p-4 shadow-sm">
      <input type="hidden" name="academicYearId" value={academicYearId} />
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Name
          <input name="name" required placeholder="e.g. Half Yearly" className="w-56 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Term
          <input name="term" placeholder="Optional" className="w-40 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Start date
          <input name="startDate" type="date" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          End date
          <input name="endDate" type="date" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" name="computeRanks" />
          Compute ranks
        </label>
      </div>

      {classes.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div>
            <span className="text-sm font-medium">Which classes sit this exam?</span>
            <p className="text-xs text-muted-foreground">
              Leave everything unticked to apply this exam to <strong>all classes</strong> — that is the default. Tick classes only when the exam is for some of them, e.g. a
              board practical. This controls which classes appear when adding subjects to this exam.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedClassIds(new Set(classes.map((c) => c.id)))}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => setSelectedClassIds(new Set())}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary"
            >
              Clear
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {classes.map((c) => {
              const isSelected = selectedClassIds.has(c.id);
              return (
                <label
                  key={c.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-secondary"}`}
                >
                  <input type="checkbox" name="classIds" value={c.id} checked={isSelected} onChange={() => toggleClass(c.id)} className="h-4 w-4 accent-primary" />
                  {c.name}
                </label>
              );
            })}
          </div>
        </div>
      ) : null}

      <AddButton />
      {state.error ? <p className="text-sm text-danger-solid">{state.error}</p> : null}
    </form>
  );
}
