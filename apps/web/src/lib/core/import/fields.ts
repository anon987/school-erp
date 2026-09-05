import type { ImportEntityType } from "./types";

export interface ImportFieldDef {
  key: string;
  label: string;
  required: boolean;
}

// Matches the CSV templates (apps/web/public/templates/*.csv) and what
// fn_commit_student_import_rows / fn_commit_staff_import_rows actually read (packages/db) --
// this is the single place both the mapping UI and any future consumer should read the field
// list from, not a second hand-copied list per screen.
const STUDENT_FIELDS: ImportFieldDef[] = [
  { key: "first_name", label: "First name", required: true },
  { key: "last_name", label: "Last name", required: true },
  { key: "class_name", label: "Class", required: true },
  { key: "section_name", label: "Section", required: true },
  { key: "admission_number", label: "Admission number", required: false },
  { key: "dob", label: "Date of birth (YYYY-MM-DD)", required: false },
  { key: "gender", label: "Gender", required: false },
  { key: "blood_group", label: "Blood group", required: false },
  { key: "category_key", label: "Category", required: false },
  { key: "house_name", label: "House", required: false },
  { key: "previous_school_name", label: "Previous school", required: false },
  { key: "roll_number", label: "Roll number", required: false },
  { key: "guardian1_name", label: "Guardian 1 name", required: false },
  { key: "guardian1_relationship", label: "Guardian 1 relationship", required: false },
  { key: "guardian1_phone", label: "Guardian 1 phone", required: false },
  { key: "guardian1_email", label: "Guardian 1 email", required: false },
  { key: "guardian2_name", label: "Guardian 2 name", required: false },
  { key: "guardian2_relationship", label: "Guardian 2 relationship", required: false },
  { key: "guardian2_phone", label: "Guardian 2 phone", required: false },
  { key: "guardian2_email", label: "Guardian 2 email", required: false },
];

const STAFF_FIELDS: ImportFieldDef[] = [
  { key: "first_name", label: "First name", required: true },
  { key: "last_name", label: "Last name", required: true },
  { key: "joining_date", label: "Joining date (YYYY-MM-DD)", required: true },
  { key: "employee_code", label: "Employee code", required: false },
  { key: "dob", label: "Date of birth (YYYY-MM-DD)", required: false },
  { key: "gender", label: "Gender", required: false },
  { key: "phone", label: "Phone", required: false },
  { key: "email", label: "Email", required: false },
  { key: "department_name", label: "Department", required: false },
  { key: "designation_name", label: "Designation", required: false },
];

export function importFieldsFor(entityType: ImportEntityType): ImportFieldDef[] {
  return entityType === "student" ? STUDENT_FIELDS : STAFF_FIELDS;
}

/**
 * Best-effort auto-mapping so a school whose file already uses (or nearly uses) our template
 * headers doesn't have to map every field by hand -- exact match first, then a normalised
 * (lowercase, spaces/hyphens collapsed to underscores) match, then a small synonym table for the
 * handful of header names real registers commonly use. Anything left unmatched shows as
 * "-- Not mapped --" in the UI and the school picks it manually; this never silently guesses
 * wrong for a REQUIRED field into something that would pass validation on bad data -- it only
 * saves a click when the guess is actually right, and either way the school reviews and confirms
 * every mapping before it's applied.
 */
const SYNONYMS: Record<string, string[]> = {
  first_name: ["firstname", "student_name", "name", "student_first_name"],
  last_name: ["lastname", "surname", "student_last_name"],
  class_name: ["class", "grade"],
  section_name: ["section", "sec"],
  admission_number: ["admission_no", "admissionno", "admission_id", "adm_no"],
  employee_code: ["emp_code", "employee_id", "staff_id", "emp_id"],
  dob: ["date_of_birth", "birth_date", "birthdate"],
  gender: ["sex"],
  guardian1_name: ["father_name", "parent_name", "guardian_name"],
  guardian1_phone: ["father_phone", "parent_phone", "guardian_phone", "mobile", "phone_number"],
  guardian2_name: ["mother_name"],
  guardian2_phone: ["mother_phone"],
  joining_date: ["date_of_joining", "doj"],
  department_name: ["department", "dept"],
  designation_name: ["designation", "role", "position"],
  house_name: ["house"],
  category_key: ["category"],
  roll_number: ["roll_no", "rollno", "roll"],
  previous_school_name: ["previous_school", "last_school"],
};

function normalise(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export function suggestMapping(entityType: ImportEntityType, csvHeaders: string[]): Record<string, string> {
  const fields = importFieldsFor(entityType);
  const normalisedHeaders = csvHeaders.map((h) => ({ original: h, normalised: normalise(h) }));
  const mapping: Record<string, string> = {};

  for (const field of fields) {
    const exact = csvHeaders.find((h) => h === field.key);
    if (exact) {
      mapping[field.key] = exact;
      continue;
    }
    const normalisedMatch = normalisedHeaders.find((h) => h.normalised === field.key);
    if (normalisedMatch) {
      mapping[field.key] = normalisedMatch.original;
      continue;
    }
    const synonyms = SYNONYMS[field.key] ?? [];
    const synonymMatch = normalisedHeaders.find((h) => synonyms.includes(h.normalised));
    if (synonymMatch) mapping[field.key] = synonymMatch.original;
  }

  return mapping;
}
