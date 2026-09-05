export type HomeworkSubmissionStatus = "pending" | "submitted" | "reviewed";

export interface StaffClassSubjectOption {
  id: string;
  className: string;
  sectionName: string;
  subjectName: string;
}

export interface HomeworkRow {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  className: string;
  sectionName: string;
  subjectName: string;
  staffName: string;
  publishedAt: string | null;
  createdAt: string;
}

export interface HomeworkSubmissionRow {
  id: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  status: HomeworkSubmissionStatus;
  content: string | null;
  submittedAt: string | null;
  teacherRemarks: string | null;
  reviewedAt: string | null;
  documentUrl: string | null;
}

export interface PortalHomeworkRow {
  submissionId: string;
  homeworkId: string;
  title: string;
  description: string;
  dueDate: string;
  subjectName: string;
  status: HomeworkSubmissionStatus;
  content: string | null;
  teacherRemarks: string | null;
  documentUrl: string | null;
}
