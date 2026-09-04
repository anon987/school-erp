/**
 * Domain types this feature's queries return -- shaped for what the UI actually needs
 * (joined class/section names, not raw FK ids), not the raw generated Row types from
 * @schoolerp/types. See CLAUDE.md's "Domain types vs. generated types" convention.
 */

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

export interface StudentDirectoryFilters {
  search?: string | undefined;
  classId?: string | undefined;
  sectionId?: string | undefined;
}

export interface StudentDirectoryPage {
  items: StudentListItem[];
  total: number;
  page: number;
  pageSize: number;
}
