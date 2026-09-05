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

export interface StaffAssignment {
  id: string;
  className: string;
  sectionName: string;
  subjectName: string;
}

export interface AssignmentFormOptions {
  classes: { id: string; name: string }[];
  sections: { id: string; classId: string; name: string }[];
  subjects: { id: string; name: string }[];
}

export interface LeaveType {
  id: string;
  name: string;
  isPaid: boolean;
}

export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface LeaveRequest {
  id: string;
  leaveTypeId: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  dayCount: number;
  reason: string | null;
  status: LeaveStatus;
  appliedAt: string;
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
