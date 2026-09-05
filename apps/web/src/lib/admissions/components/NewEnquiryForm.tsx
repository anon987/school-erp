"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createEnquiryAction, type AdmissionsFormState } from "../actions";
import type { NamedRow } from "@/lib/master-data/types";

const initialState: AdmissionsFormState = {};
const SOURCES = ["walk_in", "referral", "phone", "website", "advertisement", "other"] as const;
const SOURCE_LABELS: Record<(typeof SOURCES)[number], string> = {
  walk_in: "Walk-in",
  referral: "Referral",
  phone: "Phone",
  website: "Website",
  advertisement: "Advertisement",
  other: "Other",
};

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
    >
      Add Enquiry
    </button>
  );
}

export function NewEnquiryForm({ classes }: { classes: NamedRow[] }) {
  const [state, formAction] = useFormState(createEnquiryAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-card p-4 shadow-sm">
      <input name="firstName" required placeholder="First name" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
      <input name="lastName" placeholder="Last name" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
      <input name="phone" placeholder="+91..." className="w-36 rounded-md border border-input bg-background px-3 py-2 text-sm" />
      <input name="email" placeholder="Email" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
      <select name="classInterestedId" defaultValue="" className="rounded-md border border-input bg-background px-3 py-2 text-sm">
        <option value="">Class interested in (optional)</option>
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select name="source" defaultValue="other" className="rounded-md border border-input bg-background px-3 py-2 text-sm">
        {SOURCES.map((s) => (
          <option key={s} value={s}>
            {SOURCE_LABELS[s]}
          </option>
        ))}
      </select>
      <input name="notes" placeholder="Notes" className="min-w-[10rem] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
      <AddButton />
      {state.error ? <p className="w-full text-sm text-danger-solid">{state.error}</p> : null}
    </form>
  );
}
