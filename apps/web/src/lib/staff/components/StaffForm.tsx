"use client";

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
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
    >
      {label}
    </button>
  );
}

const inputClass = "rounded-md border border-input bg-background px-3 py-2 text-base";
const labelClass = "text-sm font-medium";
const fieldClass = "flex flex-col gap-1";

export function StaffForm({ options, staff }: { options: StaffFormOptions; staff?: StaffDetail }) {
  const action = staff ? updateStaffAction : createStaffAction;
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} noValidate className="flex max-w-2xl flex-col gap-6">
      {staff ? <input type="hidden" name="id" value={staff.id} /> : null}

      <fieldset className="flex flex-col gap-4">
        <legend className="text-sm font-semibold">Profile</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className={fieldClass}>
            <label htmlFor="employeeCode" className={labelClass}>
              Employee code
            </label>
            <input
              id="employeeCode"
              name="employeeCode"
              defaultValue={staff?.employeeCode}
              disabled={Boolean(staff)}
              placeholder="Leave blank to auto-generate"
              className={inputClass}
            />
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
            </label>
            <input id="dob" name="dob" type="date" defaultValue={staff?.dob ?? ""} className={inputClass} />
          </div>
          <div className={fieldClass}>
            <label htmlFor="gender" className={labelClass}>
              Gender
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
            </label>
            <input id="phone" name="phone" placeholder="+919415012345" defaultValue={staff?.phone ?? ""} className={inputClass} />
          </div>
          <div className={fieldClass}>
            <label htmlFor="email" className={labelClass}>
              Email
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
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="text-sm font-semibold">Department &amp; designation</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className={fieldClass}>
            <label htmlFor="departmentId" className={labelClass}>
              Department
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
      </fieldset>

      {state.error ? (
        <p role="alert" className="rounded-md bg-danger px-3 py-2 text-sm text-danger-foreground">
          {state.error}
        </p>
      ) : null}

      <SubmitButton label={staff ? "Save changes" : "Create staff record"} />
    </form>
  );
}
