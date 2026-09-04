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
}
