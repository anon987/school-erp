export interface StaffListItem {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  employmentStatus: string;
  departmentName: string | null;
  designationName: string | null;
}

export interface QualificationInfo {
  id: string;
  degree: string;
  institution: string | null;
  yearCompleted: number | null;
}

export interface StaffDetail {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  dob: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  joiningDate: string;
  employmentStatus: string;
  departmentId: string | null;
  departmentName: string | null;
  designationId: string | null;
  designationName: string | null;
  hasLogin: boolean;
  roles: string[];
  qualifications: QualificationInfo[];
}

export interface DepartmentOption {
  id: string;
  name: string;
}

export interface DesignationOption {
  id: string;
  name: string;
}

export interface StaffFormOptions {
  departments: DepartmentOption[];
  designations: DesignationOption[];
}

export type StaffSortKey = "employeeCode" | "name";

export interface StaffDirectoryFilters {
  search?: string | undefined;
  departmentId?: string | undefined;
  sort?: StaffSortKey | undefined;
  dir?: "asc" | "desc" | undefined;
}

export interface StaffDirectoryPage {
  items: StaffListItem[];
  total: number;
  page: number;
  pageSize: number;
}
