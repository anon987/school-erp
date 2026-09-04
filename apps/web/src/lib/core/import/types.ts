export type ImportEntityType = "student" | "staff";
export type ImportMatchMode = "admission_number" | "employee_code" | "none";

export interface ImportBatchSummary {
  id: string;
  entityType: ImportEntityType;
  matchMode: ImportMatchMode;
  fileName: string;
  isDryRun: boolean;
  status: string;
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  rejectedCount: number;
  committedAt: string | null;
  revertedAt: string | null;
  createdAt: string;
}

export interface RejectedRowPreview {
  rowNumber: number;
  rejectionReason: string | null;
  rawData: Record<string, string>;
}

export interface RevertBlocker {
  row_number?: number;
  guardian_id?: string;
  reason: string;
}

export interface RevertOutcome {
  reverted: boolean;
  blockers: RevertBlocker[];
}
