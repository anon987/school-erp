export type AdmissionStageType = "in_progress" | "admitted" | "rejected" | "withdrawn";

export interface AdmissionStageOption {
  id: string;
  name: string;
  sortOrder: number;
  stageType: AdmissionStageType;
}

export type EnquirySource = "walk_in" | "referral" | "phone" | "website" | "advertisement" | "other";
export type EnquiryStatus = "open" | "converted" | "closed_lost";

export interface EnquiryRow {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  classInterestedId: string | null;
  classInterestedName: string | null;
  source: EnquirySource;
  status: EnquiryStatus;
  notes: string | null;
  createdAt: string;
}

export interface ApplicationListRow {
  id: string;
  applicantFirstName: string;
  applicantLastName: string;
  classApplyingForId: string;
  classApplyingForName: string;
  currentStageId: string;
  currentStageName: string;
  currentStageType: AdmissionStageType;
  confirmedStudentId: string | null;
  createdAt: string;
}

export interface ApplicationDetail extends ApplicationListRow {
  enquiryId: string | null;
  academicYearId: string;
  dob: string | null;
  gender: "male" | "female" | "other" | null;
  categoryId: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  guardianEmail: string | null;
}

export interface StageEventRow {
  id: string;
  stageId: string;
  stageName: string;
  score: number | null;
  notes: string | null;
  occurredAt: string;
}

export type ApplicationDocumentStatus = "pending" | "uploaded" | "verified";

export interface ApplicationDocumentRow {
  id: string;
  documentTypeId: string;
  documentTypeName: string;
  isRequired: boolean;
  status: ApplicationDocumentStatus;
  documentId: string | null;
}
