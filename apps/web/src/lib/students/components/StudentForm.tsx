"use client";

import Link from "next/link";
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
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {label}
    </button>
  );
}

const inputClass = "rounded-md border border-input bg-background px-3 py-2 text-base";
const labelClass = "text-xs font-medium text-muted-foreground";
const fieldClass = "flex flex-col gap-1";

/** docs/design-system.md > Forms: mark the minority. Most fields here are required; append this to the few that aren't. */
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

export function StudentForm({
  options,
  student,
  cancelHref,
}: {
  options: StudentFormOptions;
  student?: StudentDetail;
  cancelHref: string;
}) {
  const action = student ? updateStudentAction : createStudentAction;
  const [state, formAction] = useFormState(action, initialState);

  const currentClassId = options.classes.find((c) => c.name === student?.className)?.id ?? "";

  return (
    <form action={formAction} noValidate className="flex max-w-2xl flex-col gap-6">
      {student ? <input type="hidden" name="id" value={student.id} /> : null}

      <Section title="Basic details">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className={fieldClass}>
            <label htmlFor="admissionNumber" className={labelClass}>
              Admission number
              <Optional />
            </label>
            <input
              id="admissionNumber"
              name="admissionNumber"
              defaultValue={student?.admissionNumber}
              disabled={Boolean(student)}
              className={inputClass}
            />
            <p className="text-xs text-muted-foreground">Leave blank to auto-generate.</p>
          </div>
          <div className={fieldClass}>
            <label htmlFor="rollNumber" className={labelClass}>
              Roll number
              <Optional />
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
              <Optional />
            </label>
            <input id="dob" name="dob" type="date" defaultValue={student?.dob ?? ""} className={inputClass} />
          </div>
          <div className={fieldClass}>
            <label htmlFor="gender" className={labelClass}>
              Gender
              <Optional />
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
              <Optional />
            </label>
            <input id="bloodGroup" name="bloodGroup" defaultValue={student?.bloodGroup ?? ""} className={inputClass} />
          </div>
          <div className={fieldClass}>
            <label htmlFor="categoryId" className={labelClass}>
              Category
              <Optional />
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
              <Optional />
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
      </Section>

      <Section title="Class & section">
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
      </Section>

      {([1, 2] as const).map((slot) => {
        const existing = student?.guardians[slot - 1];
        return (
          <Section key={slot} title={`Guardian ${slot}`}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className={fieldClass}>
                <label htmlFor={`guardian${slot}Name`} className={labelClass}>
                  Name
                  <Optional />
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
                  <Optional />
                </label>
                <input
                  id={`guardian${slot}Phone`}
                  name={`guardian${slot}Phone`}
                  defaultValue={existing?.phone ?? ""}
                  className={inputClass}
                />
                <p className="text-xs text-muted-foreground">e.g. +919415012345</p>
              </div>
              <div className={fieldClass}>
                <label htmlFor={`guardian${slot}Email`} className={labelClass}>
                  Email
                  <Optional />
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
          </Section>
        );
      })}

      {state.error ? (
        <p role="alert" className="rounded-md border border-border bg-danger px-3 py-2 text-sm text-danger-foreground shadow-sm">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Link href={cancelHref} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary">
          Cancel
        </Link>
        <SubmitButton label={student ? "Save changes" : "Create student"} />
      </div>
    </form>
  );
}
