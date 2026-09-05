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
  /** The uploaded file's own column headers, in file order -- null once mapping has been applied. */
  rawHeaders: string[] | null;
}

export interface RejectedRowPreview {
  rowNumber: number;
  rejectionReason: string | null;
  rawData: Record<string, string>;
  /** Field-name-keyed, unlike rawData (which keeps the uploaded file's own column headers after column mapping) -- what the on-screen preview identifies the row by. */
  mappedData: Record<string, string>;
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
