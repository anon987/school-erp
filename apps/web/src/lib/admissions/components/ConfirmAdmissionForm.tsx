"use client";

import { useFormState, useFormStatus } from "react-dom";
import { confirmAdmissionAction, type AdmissionsFormState } from "../actions";
import type { SectionRow } from "@/lib/master-data/types";

const initialState: AdmissionsFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
    >
      Confirm admission
    </button>
  );
}

/**
 * Only rendered once the application isn't confirmed yet and the school has a section for the
 * applied-for class -- fn_confirm_admission (packages/db) does the actual student/enrollment
 * creation transactionally; this just collects the one input it needs beyond what's already on
 * the application (which section, since applications only capture class, not section).
 */
export function ConfirmAdmissionForm({ applicationId, sections }: { applicationId: string; sections: SectionRow[] }) {
  const [state, formAction] = useFormState(confirmAdmissionAction.bind(null, applicationId), initialState);

  if (sections.length === 0) {
    return <p className="text-sm text-muted-foreground">No sections configured for this class yet -- add one in Settings &gt; Master Data.</p>;
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-card p-4 shadow-sm">
      <label className="flex flex-col gap-1 text-sm">
        Section
        <select name="sectionId" required defaultValue="" className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="" disabled>
            Select a section
          </option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <SubmitButton />
      {state.error ? <p className="w-full text-sm text-danger-solid">{state.error}</p> : null}
    </form>
  );
}
