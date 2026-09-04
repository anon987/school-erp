"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import type { StaffDetail, StaffFormOptions } from "../types";
import { createStaffAction, updateStaffAction, type StaffFormState } from "../actions";

const initialState: StaffFormState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {label}
    </button>
  );
}

const inputClass = "rounded-md border border-input bg-background px-3 py-2 text-base";
const labelClass = "text-xs font-medium text-muted-foreground";
const fieldClass = "flex flex-col gap-1";

function Optional() {
  return <span className="font-normal normal-case text-muted-foreground"> (optional)</span>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-md border border-border bg-card p-4 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function StaffForm({ options, staff, cancelHref }: { options: StaffFormOptions; staff?: StaffDetail; cancelHref: string }) {
  const action = staff ? updateStaffAction : createStaffAction;
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} noValidate className="flex max-w-2xl flex-col gap-6">
      {staff ? <input type="hidden" name="id" value={staff.id} /> : null}

      <Section title="Profile">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className={fieldClass}>
            <label htmlFor="employeeCode" className={labelClass}>
              Employee code
              <Optional />
            </label>
            <input
              id="employeeCode"
              name="employeeCode"
              defaultValue={staff?.employeeCode}
              disabled={Boolean(staff)}
              className={inputClass}
            />
            <p className="text-xs text-muted-foreground">Leave blank to auto-generate.</p>
          </div>
          <div className={fieldClass}>
            <label htmlFor="joiningDate" className={labelClass}>
              Joining date
            </label>
            <input
              id="joiningDate"
              name="joiningDate"
              type="date"
              required
              defaultValue={staff?.joiningDate}
              className={inputClass}
            />
          </div>
          <div className={fieldClass}>
            <label htmlFor="firstName" className={labelClass}>
              First name
            </label>
            <input id="firstName" name="firstName" required defaultValue={staff?.firstName} className={inputClass} />
          </div>
          <div className={fieldClass}>
            <label htmlFor="lastName" className={labelClass}>
              Last name
            </label>
            <input id="lastName" name="lastName" required defaultValue={staff?.lastName} className={inputClass} />
          </div>
          <div className={fieldClass}>
            <label htmlFor="dob" className={labelClass}>
              Date of birth
              <Optional />
            </label>
            <input id="dob" name="dob" type="date" defaultValue={staff?.dob ?? ""} className={inputClass} />
          </div>
          <div className={fieldClass}>
            <label htmlFor="gender" className={labelClass}>
              Gender
              <Optional />
            </label>
            <select id="gender" name="gender" defaultValue={staff?.gender ?? ""} className={inputClass}>
              <option value="">Not specified</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className={fieldClass}>
            <label htmlFor="phone" className={labelClass}>
              Phone
              <Optional />
            </label>
            <input id="phone" name="phone" defaultValue={staff?.phone ?? ""} className={inputClass} />
            <p className="text-xs text-muted-foreground">e.g. +919415012345</p>
          </div>
          <div className={fieldClass}>
            <label htmlFor="email" className={labelClass}>
              Email
              <Optional />
            </label>
            <input id="email" name="email" type="email" defaultValue={staff?.email ?? ""} className={inputClass} />
          </div>
          <div className={fieldClass}>
            <label htmlFor="employmentStatus" className={labelClass}>
              Employment status
            </label>
            <select
              id="employmentStatus"
              name="employmentStatus"
              defaultValue={staff?.employmentStatus ?? "active"}
              className={inputClass}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </Section>

      <Section title="Department & designation">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className={fieldClass}>
            <label htmlFor="departmentId" className={labelClass}>
              Department
              <Optional />
            </label>
            <select id="departmentId" name="departmentId" defaultValue={staff?.departmentId ?? ""} className={inputClass}>
              <option value="">Not specified</option>
              {options.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className={fieldClass}>
            <label htmlFor="designationId" className={labelClass}>
              Designation
              <Optional />
            </label>
            <select id="designationId" name="designationId" defaultValue={staff?.designationId ?? ""} className={inputClass}>
              <option value="">Not specified</option>
              {options.designations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Section>

      {state.error ? (
        <p role="alert" className="rounded-md border border-border bg-danger px-3 py-2 text-sm text-danger-foreground shadow-sm">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Link href={cancelHref} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary">
          Cancel
        </Link>
        <SubmitButton label={staff ? "Save changes" : "Create staff record"} />
      </div>
    </form>
  );
}
