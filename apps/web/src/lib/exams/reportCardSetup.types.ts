export interface ReportCardSetupExamRow {
  examId: string;
  examName: string;
  weightPercent: number;
}

export interface ReportCardSetup {
  id: string;
  academicYearId: string;
  name: string;
  template: string;
  computeRanks: boolean;
  isPublished: boolean;
  includeHpc: boolean;
  exams: ReportCardSetupExamRow[];
}
