/**
 * Domain types this feature's queries return -- shaped for what the UI actually needs
 * (joined class/section names, not raw FK ids), not the raw generated Row types from
 * @schoolerp/types. See CLAUDE.md's "Domain types vs. generated types" convention.
 */

/** "none" = no invoices generated yet for this student this year (not a status the school set). */
export type StudentFeeStatus = "paid" | "due" | "none";

export interface StudentListItem {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  status: string;
  gender: string | null;
  className: string | null;
  sectionName: string | null;
  rollNumber: string | null;
  feeStatus: StudentFeeStatus;
  feeDueAmountPaise: number;
}

export interface GuardianInfo {
  guardianId: string;
  firstName: string;
  relationshipType: string;
  phone: string | null;
  email: string | null;
  isPrimaryContact: boolean;
}

export interface StudentDetail {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  dob: string | null;
  gender: string | null;
  bloodGroup: string | null;
  status: string;
  statusSince: string;
  categoryId: string | null;
  houseId: string | null;
  previousSchoolName: string | null;
  className: string | null;
  sectionName: string | null;
  rollNumber: string | null;
  guardians: GuardianInfo[];
}

export interface ClassOption {
  id: string;
  name: string;
}

export interface SectionOption {
  id: string;
  classId: string;
  name: string;
}

export interface HouseOption {
  id: string;
  name: string;
}

export interface CategoryOption {
  id: string;
  key: string;
  label: string;
}

export interface StudentFormOptions {
  classes: ClassOption[];
  sections: SectionOption[];
  houses: HouseOption[];
  categories: CategoryOption[];
}

export type StudentSortKey = "admissionNumber" | "name";

export interface StudentDirectoryFilters {
  search?: string | undefined;
  classId?: string | undefined;
  sectionId?: string | undefined;
  feeStatus?: StudentFeeStatus | undefined;
  sort?: StudentSortKey | undefined;
  dir?: "asc" | "desc" | undefined;
}

export interface StudentDirectoryPage {
  items: StudentListItem[];
  total: number;
  page: number;
  pageSize: number;
}

/** P1 baseline "student master" report -- every enrolled student for one academic year, not
 *  paginated like the directory (that's for browsing, this is for exporting the whole list). */
export interface StudentMasterReportRow {
  admissionNumber: string;
  firstName: string;
  lastName: string;
  dob: string | null;
  gender: string | null;
  className: string;
  sectionName: string;
  rollNumber: string | null;
  status: string;
  fatherName: string | null;
  contactPhone: string | null;
}

/** P1 baseline "class strength" report. */
export interface ClassStrengthRow {
  className: string;
  sectionName: string;
  male: number;
  female: number;
  other: number;
  total: number;
}
