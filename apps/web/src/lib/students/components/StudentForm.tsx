"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { StudentDetail, StudentFormOptions } from "../types";
import { createStudentAction, updateStudentAction, type StudentFormState } from "../actions";

const initialState: StudentFormState = {};

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

export function StudentForm({
  options,
  student,
}: {
  options: StudentFormOptions;
  student?: StudentDetail;
}) {
  const action = student ? updateStudentAction : createStudentAction;
  const [state, formAction] = useFormState(action, initialState);

  const currentClassId = options.classes.find((c) => c.name === student?.className)?.id ?? "";

  return (
    <form action={formAction} noValidate className="flex max-w-2xl flex-col gap-6">
      {student ? <input type="hidden" name="id" value={student.id} /> : null}

      <fieldset className="flex flex-col gap-4">
        <legend className="text-sm font-semibold">Student</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className={fieldClass}>
            <label htmlFor="admissionNumber" className={labelClass}>
              Admission number
            </label>
            <input
              id="admissionNumber"
              name="admissionNumber"
              defaultValue={student?.admissionNumber}
              disabled={Boolean(student)}
              placeholder="Leave blank to auto-generate"
              className={inputClass}
            />
          </div>
          <div className={fieldClass}>
            <label htmlFor="rollNumber" className={labelClass}>
              Roll number
            </label>
            <input id="rollNumber" name="rollNumber" defaultValue={student?.rollNumber ?? ""} className={inputClass} />
          </div>
          <div className={fieldClass}>
            <label htmlFor="firstName" className={labelClass}>
              First name
            </label>
            <input id="firstName" name="firstName" required defaultValue={student?.firstName} className={inputClass} />
          </div>
          <div className={fieldClass}>
            <label htmlFor="lastName" className={labelClass}>
              Last name
            </label>
            <input id="lastName" name="lastName" required defaultValue={student?.lastName} className={inputClass} />
          </div>
          <div className={fieldClass}>
            <label htmlFor="dob" className={labelClass}>
              Date of birth
            </label>
            <input id="dob" name="dob" type="date" defaultValue={student?.dob ?? ""} className={inputClass} />
          </div>
          <div className={fieldClass}>
            <label htmlFor="gender" className={labelClass}>
              Gender
            </label>
            <select id="gender" name="gender" defaultValue={student?.gender ?? ""} className={inputClass}>
              <option value="">Not specified</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className={fieldClass}>
            <label htmlFor="bloodGroup" className={labelClass}>
              Blood group
            </label>
            <input id="bloodGroup" name="bloodGroup" defaultValue={student?.bloodGroup ?? ""} className={inputClass} />
          </div>
          <div className={fieldClass}>
            <label htmlFor="categoryId" className={labelClass}>
              Category
            </label>
            <select id="categoryId" name="categoryId" defaultValue={student?.categoryId ?? ""} className={inputClass}>
              <option value="">Not specified</option>
              {options.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className={fieldClass}>
            <label htmlFor="houseId" className={labelClass}>
              House
            </label>
            <select id="houseId" name="houseId" defaultValue={student?.houseId ?? ""} className={inputClass}>
              <option value="">Not specified</option>
              {options.houses.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="text-sm font-semibold">Class &amp; section</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className={fieldClass}>
            <label htmlFor="classId" className={labelClass}>
              Class
            </label>
            <select id="classId" name="classId" required defaultValue={currentClassId} className={inputClass}>
              <option value="">Select a class</option>
              {options.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className={fieldClass}>
            <label htmlFor="sectionId" className={labelClass}>
              Section
            </label>
            <select id="sectionId" name="sectionId" required defaultValue="" className={inputClass}>
              <option value="">Select a section</option>
              {options.sections.map((s) => {
                const className = options.classes.find((c) => c.id === s.classId)?.name ?? "";
                return (
                  <option key={s.id} value={s.id}>
                    {className} - {s.name}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="text-sm font-semibold">Guardians</legend>
        {([1, 2] as const).map((slot) => {
          const existing = student?.guardians[slot - 1];
          return (
            <div key={slot} className="grid grid-cols-1 gap-4 rounded-md border border-border p-3 sm:grid-cols-2">
              <div className={fieldClass}>
                <label htmlFor={`guardian${slot}Name`} className={labelClass}>
                  Guardian {slot} name
                </label>
                <input
                  id={`guardian${slot}Name`}
                  name={`guardian${slot}Name`}
                  defaultValue={existing?.firstName ?? ""}
                  className={inputClass}
                />
              </div>
              <div className={fieldClass}>
                <label htmlFor={`guardian${slot}Relationship`} className={labelClass}>
                  Relationship
                </label>
                <select
                  id={`guardian${slot}Relationship`}
                  name={`guardian${slot}Relationship`}
                  defaultValue={existing?.relationshipType ?? (slot === 1 ? "father" : "mother")}
                  className={inputClass}
                >
                  <option value="father">Father</option>
                  <option value="mother">Mother</option>
                  <option value="guardian">Guardian</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className={fieldClass}>
                <label htmlFor={`guardian${slot}Phone`} className={labelClass}>
                  Phone
                </label>
                <input
                  id={`guardian${slot}Phone`}
                  name={`guardian${slot}Phone`}
                  placeholder="+919415012345"
                  defaultValue={existing?.phone ?? ""}
                  className={inputClass}
                />
              </div>
              <div className={fieldClass}>
                <label htmlFor={`guardian${slot}Email`} className={labelClass}>
                  Email
                </label>
                <input
                  id={`guardian${slot}Email`}
                  name={`guardian${slot}Email`}
                  type="email"
                  defaultValue={existing?.email ?? ""}
                  className={inputClass}
                />
              </div>
            </div>
          );
        })}
      </fieldset>

      {state.error ? (
        <p role="alert" className="rounded-md bg-danger px-3 py-2 text-sm text-danger-foreground">
          {state.error}
        </p>
      ) : null}

      <SubmitButton label={student ? "Save changes" : "Create student"} />
    </form>
  );
}
