"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { SchoolProfile } from "../types";
import { updateSchoolProfileAction, type SchoolProfileFormState } from "../actions";

const initialState: SchoolProfileFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      Save
    </button>
  );
}

const inputClass = "rounded-md border border-input bg-background px-3 py-2 text-base";
const labelClass = "text-xs font-medium text-muted-foreground";
const fieldClass = "flex flex-col gap-1";

function Optional() {
  return <span className="font-normal normal-case text-muted-foreground"> (optional)</span>;
}

export function SchoolProfileForm({ profile }: { profile: SchoolProfile }) {
  const [state, formAction] = useFormState(updateSchoolProfileAction, initialState);

  return (
    <form action={formAction} noValidate className="flex max-w-2xl flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-md border border-border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">School details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className={fieldClass}>
            <label htmlFor="legalName" className={labelClass}>
              School name
            </label>
            <input id="legalName" name="legalName" required defaultValue={profile.legalName} className={inputClass} />
          </div>
          <div className={fieldClass}>
            <label htmlFor="board" className={labelClass}>
              Board / affiliation
              <Optional />
            </label>
            <input id="board" name="board" defaultValue={profile.board ?? ""} className={inputClass} />
            <p className="text-xs text-muted-foreground">e.g. UP Board, CBSE</p>
          </div>
          <div className={`${fieldClass} sm:col-span-2`}>
            <label htmlFor="address" className={labelClass}>
              Address
              <Optional />
            </label>
            <textarea id="address" name="address" rows={2} defaultValue={profile.address ?? ""} className={inputClass} />
          </div>
          <div className={fieldClass}>
            <label htmlFor="contactPhone" className={labelClass}>
              Contact phone
              <Optional />
            </label>
            <input id="contactPhone" name="contactPhone" defaultValue={profile.contactPhone ?? ""} className={inputClass} />
            <p className="text-xs text-muted-foreground">e.g. +919415012345</p>
          </div>
          <div className={fieldClass}>
            <label htmlFor="contactEmail" className={labelClass}>
              Contact email
              <Optional />
            </label>
            <input
              id="contactEmail"
              name="contactEmail"
              type="email"
              defaultValue={profile.contactEmail ?? ""}
              className={inputClass}
            />
          </div>
          <div className={fieldClass}>
            <label htmlFor="gstin" className={labelClass}>
              GSTIN
              <Optional />
            </label>
            <input id="gstin" name="gstin" defaultValue={profile.gstin ?? ""} className={`${inputClass} uppercase`} />
            <p className="text-xs text-muted-foreground">Printed on fee receipts when set. Leave blank if not GST-registered.</p>
          </div>
        </div>
      </section>

      {state.error ? (
        <p role="alert" className="rounded-md border border-border bg-danger px-3 py-2 text-sm text-danger-foreground shadow-sm">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="rounded-md border border-border bg-success px-3 py-2 text-sm text-success-foreground shadow-sm">
          Saved.
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <SubmitButton />
      </div>
    </form>
  );
}
