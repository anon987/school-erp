"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateClassSubjectMappingAction, type MasterDataFormState } from "../actions";
import type { ClassWithSections, SubjectRow } from "../types";

const initialState: MasterDataFormState = {};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
    >
      Save mapping
    </button>
  );
}

/**
 * A checkbox matrix, not per-class multi-selects -- fastest UI for an N x M boolean relationship,
 * and it submits as one action (a full replace server-side, see updateClassSubjectMappingAction)
 * rather than one round trip per toggle.
 */
export function ClassSubjectMatrix({ classes, subjects, pairs }: { classes: ClassWithSections[]; subjects: SubjectRow[]; pairs: Set<string> }) {
  const [state, formAction] = useFormState(updateClassSubjectMappingAction, initialState);

  if (classes.length === 0 || subjects.length === 0) {
    return (
      <section className="flex flex-col gap-3 rounded-md border border-border p-4">
        <h2 className="text-lg font-semibold">Class-Subject Mapping</h2>
        <p className="text-sm text-muted-foreground">Add at least one class and one subject first.</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-md border border-border p-4">
      <div>
        <h2 className="text-lg font-semibold">Class-Subject Mapping</h2>
        <p className="text-sm text-muted-foreground">Optional now -- which subjects apply to which class.</p>
      </div>
      <form action={formAction} className="flex flex-col gap-3">
        <div className="overflow-x-auto">
          <table className="border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-b border-border p-2 text-left">Class</th>
                {subjects.map((s) => (
                  <th key={s.id} className="border-b border-border p-2 text-center font-medium">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c.id}>
                  <td className="border-b border-border p-2 font-medium">{c.name}</td>
                  {subjects.map((s) => {
                    const pairKey = `${c.id}:${s.id}`;
                    return (
                      <td key={s.id} className="border-b border-border p-2 text-center">
                        <input type="checkbox" name="pair" value={pairKey} defaultChecked={pairs.has(pairKey)} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <SaveButton />
        </div>
        {state.error ? <p className="text-sm text-danger-solid">{state.error}</p> : null}
      </form>
    </section>
  );
}
