export interface AdmitCardSettings {
  template: string;
}

export type FeeLockMode = "off" | "block";

export interface ExamAdmitCardSettings {
  template: string | null;
  releaseEnabled: boolean;
  availableFrom: string | null;
  availableUntil: string | null;
  feeLockMode: FeeLockMode;
  feeLockMaxDuePaise: number;
  instructions: string | null;
  reportingTime: string | null;
  examCentre: string | null;
  principalName: string | null;
  controllerOfExams: string | null;
  hallTicketPrefix: string | null;
  showStudentPhoto: boolean;
  showSignatureLines: boolean;
}

export interface AdmitCardListRow {
  studentId: string;
  admissionNumber: string;
  rollNumber: string | null;
  firstName: string;
  lastName: string;
  fatherName: string | null;
  dueAmountPaise: number;
  isHeld: boolean;
  holdReason: string | null;
}

export interface AdmitCardDatesheetRow {
  subjectName: string;
  examDate: string | null;
  startTime: string | null;
  endTime: string | null;
  roomNo: string | null;
}

export interface AdmitCardData {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  rollNumber: string | null;
  className: string;
  sectionName: string;
  photoUrl: string | null;
  examName: string;
  academicYearName: string;
  datesheet: AdmitCardDatesheetRow[];
  hallTicketNumber: string;
  settings: ExamAdmitCardSettings;
  /** Inputs to the fee-lock/hold eligibility check -- carried on the data object so the PDF route
   *  can re-check blocking server-side from one query result, rather than trusting the caller. */
  dueAmountPaise: number;
  isHeld: boolean;
  holdReason: string | null;
}

export interface AdmitCardEligibility {
  blocked: boolean;
  reason: string | null;
}
