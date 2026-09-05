import type { IdCardOrientation } from "./idCardTemplates";

/**
 * One shape for both card types -- a student's "Class IX - B" and a staff member's "Teacher,
 * Science Department" are both just `subtitle`, so IdCardView/idCardPdf render both identically
 * without a student/staff branch in the layout itself. Fields that only apply to one card type
 * (fatherName/motherName/rollNumber/address for students; contactPhone differs in source but not
 * shape) are simply null on the type that doesn't have them.
 */
export interface IdCardData {
  personId: string;
  name: string;
  idLabel: string;
  idNumber: string;
  subtitle: string;
  fatherName: string | null;
  motherName: string | null;
  rollNumber: string | null;
  address: string | null;
  contactPhone: string | null;
  bloodGroup: string | null;
  dob: string | null;
  photoUrl: string | null;
  academicYearName: string | null;
}

/**
 * Student and staff cards are configured (and previewed) independently -- a school may want a
 * playful design for students and a plainer one for staff -- but share one card shape/orientation
 * and one set of field-visibility toggles, since both card types are printed and laminated the
 * same way.
 */
export interface IdCardSettings {
  studentTemplate: string;
  staffTemplate: string;
  orientation: IdCardOrientation;
  showBloodGroup: boolean;
  showDob: boolean;
  showFatherName: boolean;
  showMotherName: boolean;
  showAddress: boolean;
  showContact: boolean;
}
