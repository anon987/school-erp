"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "../supabase/server";
import { getSession } from "../auth/session";
import { requirePermission } from "../auth/permissions";
import { parseCsv } from "./csv";
import type { ImportEntityType, ImportMatchMode, RevertOutcome } from "./types";

// Genuinely cross-feature (docs/schoolerp_features.md: Students AND Staff both import) --
// lives in lib/core/import, not duplicated per feature. entityType/redirectBasePath are bound
// via .bind() at the call site in each feature's page (same pattern as
// lib/core/theme/ThemeToggle.tsx binding a fixed argument onto a shared Server Action).

const STAGE_CHUNK_SIZE = 500;
const COMMIT_CHUNK_SIZE = 300;
const MAX_ROWS = 5000;

function permissionFor(entityType: ImportEntityType): string {
  return entityType === "student" ? "school.manage_students" : "school.manage_staff";
}

export interface UploadImportState {
  error?: string;
}

export async function uploadImportAction(
  entityType: ImportEntityType,
  redirectBasePath: string,
  _prevState: UploadImportState,
  formData: FormData,
): Promise<UploadImportState> {
  await requirePermission(permissionFor(entityType));
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a CSV file." };
  }
  const matchModeRaw = formData.get("matchMode");
  const matchMode = (typeof matchModeRaw === "string" ? matchModeRaw : "none") as ImportMatchMode;
  const isDryRun = formData.get("isDryRun") === "on";

  const text = await file.text();
  const { rows } = parseCsv(text);
  if (rows.length === 0) return { error: "The file has no data rows." };
  if (rows.length > MAX_ROWS) {
    return { error: `This file has ${rows.length} rows -- split it into files of ${MAX_ROWS} or fewer.` };
  }

  const supabase = await createSupabaseServerClient();

  const { data: batch, error: batchError } = await supabase
    .from("import_batch")
    .insert({
      school_id: session.schoolId,
      entity_type: entityType,
      match_mode: matchMode,
      file_name: file.name,
      uploaded_by_auth_user_id: session.authUserId,
      is_dry_run: isDryRun,
    })
    .select("id")
    .single();
  if (batchError || !batch) return { error: batchError?.message ?? "Could not create the import batch." };
  const batchId = (batch as unknown as { id: string }).id;

  // Staged in chunks, not one row per round trip -- see packages/db's import_commit_chunking
  // migration for why this matters at real volume.
  for (let i = 0; i < rows.length; i += STAGE_CHUNK_SIZE) {
    const slice = rows.slice(i, i + STAGE_CHUNK_SIZE);
    const chunk = slice.map((row, idx) => ({
      batch_id: batchId,
      row_number: i + idx + 1,
      raw_data: row,
      mapped_data: row,
    }));
    const { error } = await supabase.from("import_row").insert(chunk);
    if (error) {
      return { error: `Failed staging rows ${i + 1}-${i + slice.length}: ${error.message}` };
    }
  }

  // Chunked, same reason as commit -- see the import_validate_chunking migration (validation
  // alone can hit the same statement timeout as commit at real volume; found by re-running the
  // volume test suite, not by inspection).
  let validated = false;
  let validateIterations = 0;
  while (!validated) {
    validateIterations += 1;
    if (validateIterations > 30) {
      return { error: "Validation is taking unexpectedly long -- stopped after 30 chunks." };
    }
    const { data, error } = await supabase.rpc("fn_validate_import_batch", {
      p_batch_id: batchId,
      p_limit: COMMIT_CHUNK_SIZE,
    });
    if (error) return { error: error.message };
    validated = (data as unknown as { done: boolean }).done;
  }

  revalidatePath(redirectBasePath);
  redirect(`${redirectBasePath}/${batchId}`);
}

export interface CommitState {
  error?: string;
  done?: boolean;
}

export async function commitImportBatchAction(
  entityType: ImportEntityType,
  batchId: string,
  redirectBasePath: string,
  _prevState: CommitState,
  _formData: FormData,
): Promise<CommitState> {
  await requirePermission(permissionFor(entityType));
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const supabase = await createSupabaseServerClient();

  let done = false;
  let iterations = 0;
  while (!done) {
    iterations += 1;
    if (iterations > 50) {
      return { error: "Commit is taking unexpectedly long -- stopped after 50 chunks. Nothing further was changed." };
    }
    const { data, error } = await supabase.rpc("fn_commit_import_batch", {
      p_batch_id: batchId,
      p_actor_auth_user_id: session.authUserId,
      p_limit: COMMIT_CHUNK_SIZE,
    });
    if (error) return { error: error.message };
    done = (data as unknown as { done: boolean }).done;
  }

  revalidatePath(`${redirectBasePath}/${batchId}`);
  return { done: true };
}

export interface RevertState {
  error?: string;
  result?: RevertOutcome;
}

export async function revertImportBatchAction(
  entityType: ImportEntityType,
  batchId: string,
  redirectBasePath: string,
  _prevState: RevertState,
  _formData: FormData,
): Promise<RevertState> {
  await requirePermission(permissionFor(entityType));
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("fn_revert_import_batch", {
    p_batch_id: batchId,
    p_actor_auth_user_id: session.authUserId,
  });
  if (error) return { error: error.message };

  revalidatePath(`${redirectBasePath}/${batchId}`);
  return { result: data as unknown as RevertOutcome };
}
