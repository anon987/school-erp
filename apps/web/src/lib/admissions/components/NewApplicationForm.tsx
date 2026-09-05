"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createApplicationAction, type AdmissionsFormState } from "../actions";
import type { NamedRow, StudentCategoryRow } from "@/lib/master-data/types";

const initialState: AdmissionsFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
    >
      Create application
    </button>
  );
}

export function NewApplicationForm({
  classes,
  categories,
  academicYearId,
  enquiryId,
  prefill,
}: {
  classes: NamedRow[];
  categories: StudentCategoryRow[];
  academicYearId: string;
  enquiryId?: string;
  prefill?: { firstName: string; lastName: string; classId: string | null; phone: string | null; email: string | null };
}) {
  const [state, formAction] = useFormState(createApplicationAction, initialState);

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4 rounded-md border border-border bg-card p-4 shadow-sm">
      <input type="hidden" name="academicYearId" value={academicYearId} />
      {enquiryId ? <input type="hidden" name="enquiryId" value={enquiryId} /> : null}

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          First name
          <input
            name="applicantFirstName"
            required
            defaultValue={prefill?.firstName}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Last name
          <input
            name="applicantLastName"
            required
            defaultValue={prefill?.lastName}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Date of birth
          <input name="dob" type="date" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Gender
          <select name="gender" defaultValue="" className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">Not specified</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Class applying for
          <select
            name="classApplyingForId"
            required
            defaultValue={prefill?.classId ?? ""}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Select a class
            </option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Category
          <select name="categoryId" defaultValue="" className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">Not specified</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Guardian name
          <input name="guardianName" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Guardian phone
          <input
            name="guardianPhone"
            placeholder="+91..."
            defaultValue={prefill?.phone ?? ""}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Guardian email
          <input
            name="guardianEmail"
            type="email"
            defaultValue={prefill?.email ?? ""}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
      </div>

      <p className="text-xs text-muted-foreground">
        A guardian email is needed later to invite the parent to the portal (once it ships) -- add one if available, even if the school doesn't
        use it today.
      </p>

      <div>
        <SubmitButton />
        {state.error ? <p className="mt-2 text-sm text-danger-solid">{state.error}</p> : null}
      </div>
    </form>
  );
}
