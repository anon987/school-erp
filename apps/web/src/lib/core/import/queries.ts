import { createSupabaseServerClient } from "../supabase/server";
import type { ImportBatchSummary, RejectedRowPreview } from "./types";

interface ImportBatchRow {
  id: string;
  entity_type: string;
  match_mode: string;
  file_name: string;
  is_dry_run: boolean;
  status: string;
  total_rows: number;
  created_count: number;
  updated_count: number;
  rejected_count: number;
  committed_at: string | null;
  reverted_at: string | null;
  created_at: string;
  raw_headers: string[] | null;
}

export async function getImportBatch(schoolId: string, batchId: string): Promise<ImportBatchSummary | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("import_batch")
    .select(
      "id, entity_type, match_mode, file_name, is_dry_run, status, total_rows, created_count, updated_count, rejected_count, committed_at, reverted_at, created_at, raw_headers",
    )
    .eq("school_id", schoolId)
    .eq("id", batchId)
    .maybeSingle()
    .returns<ImportBatchRow | null>();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    entityType: data.entity_type as ImportBatchSummary["entityType"],
    matchMode: data.match_mode as ImportBatchSummary["matchMode"],
    fileName: data.file_name,
    isDryRun: data.is_dry_run,
    status: data.status,
    totalRows: data.total_rows,
    createdCount: data.created_count,
    updatedCount: data.updated_count,
    rejectedCount: data.rejected_count,
    committedAt: data.committed_at,
    revertedAt: data.reverted_at,
    createdAt: data.created_at,
    rawHeaders: data.raw_headers,
  };
}

export async function getRejectedRows(batchId: string, limit = 100): Promise<RejectedRowPreview[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("import_row")
    .select("row_number, rejection_reason, raw_data, mapped_data")
    .eq("batch_id", batchId)
    .eq("validation_status", "rejected")
    .order("row_number", { ascending: true })
    .limit(limit)
    .returns<{ row_number: number; rejection_reason: string | null; raw_data: Record<string, string>; mapped_data: Record<string, string> }[]>();

  if (error) throw error;
  return (data ?? []).map((row) => ({
    rowNumber: row.row_number,
    rejectionReason: row.rejection_reason,
    rawData: row.raw_data,
    mappedData: row.mapped_data,
  }));
}
