/** Mirrors apps/web/src/lib/portal/types.ts exactly -- same shapes, same feature set. */
export interface LinkedStudentRow {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  className: string | null;
  sectionName: string | null;
}

export interface PortalExamRow {
  id: string;
  name: string;
  term: string | null;
  classId: string;
}

export type LeaveApplicationStatus = "pending" | "approved" | "rejected";

export interface LeaveApplicationRow {
  id: string;
  studentId: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: LeaveApplicationStatus;
  createdAt: string;
  reviewedAt: string | null;
}

export interface GuardianProfile {
  guardianId: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  links: { studentId: string; studentName: string; relationshipType: string; phone: string | null }[];
}

export interface PortalNoticeRow {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}
