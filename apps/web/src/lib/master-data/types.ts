export interface AcademicYearRow {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface ClassRow {
  id: string;
  name: string;
  sortOrder: number;
}

export interface SectionRow {
  id: string;
  classId: string;
  name: string;
}

export interface ClassWithSections extends ClassRow {
  sections: SectionRow[];
}

export interface SubjectRow {
  id: string;
  name: string;
  code: string | null;
}

export interface NamedRow {
  id: string;
  name: string;
}

export interface StudentCategoryRow {
  id: string;
  key: string;
  label: string;
}

export interface HolidayRow {
  id: string;
  date: string;
  name: string;
}

export interface GradeBandRow {
  id: string;
  minPercentage: number;
  maxPercentage: number;
  gradeLabel: string;
  gradePoint: number | null;
  remark: string | null;
}

export type AdmissionStageType = "in_progress" | "admitted" | "rejected" | "withdrawn";

export interface AdmissionStageRow {
  id: string;
  name: string;
  sortOrder: number;
  stageType: AdmissionStageType;
}

export interface AdmissionDocumentTypeRow {
  id: string;
  name: string;
  isRequired: boolean;
  sortOrder: number;
}

export interface PeriodRow {
  id: string;
  periodNumber: number;
  label: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
}

export type HpcCriterionCategory = "co_curricular" | "life_skill";

export interface HpcCriterionRow {
  id: string;
  category: HpcCriterionCategory;
  name: string;
  sortOrder: number;
}

export interface HpcRatingScaleRow {
  id: string;
  code: string;
  label: string;
  sortOrder: number;
}

export interface MasterDataOverview {
  academicYears: AcademicYearRow[];
  classesWithSections: ClassWithSections[];
  subjects: SubjectRow[];
  /** "classId:subjectId" pairs currently mapped, for O(1) matrix lookups in the UI. */
  classSubjectPairs: Set<string>;
  departments: NamedRow[];
  designations: NamedRow[];
  houses: NamedRow[];
  studentCategories: StudentCategoryRow[];
  holidays: HolidayRow[];
  gradeBands: GradeBandRow[];
  admissionStages: AdmissionStageRow[];
  admissionDocumentTypes: AdmissionDocumentTypeRow[];
  periods: PeriodRow[];
  hpcCriteria: HpcCriterionRow[];
  hpcRatingScales: HpcRatingScaleRow[];
}
