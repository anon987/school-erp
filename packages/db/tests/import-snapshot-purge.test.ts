import { beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { seedFixtures } from "./seedFixtures";

/**
 * previous_data is a PII shadow copy (guardian phone numbers, addresses) kept only to make
 * revert possible within its 7-day window -- see the import_pipeline_tables and
 * import_snapshot_purge migrations. This proves the purge actually runs and is scoped
 * correctly: an overdue batch's snapshot is nulled, a recent one's survives.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set -- see tests/README.md`);
  return value;
}

describe("fn_purge_expired_import_snapshots", () => {
  let client: SupabaseClient;
  let authUserId: string;

  beforeAll(async () => {
    const supabaseUrl = requireEnv("TEST_SUPABASE_URL");
    const anonKey = requireEnv("TEST_SUPABASE_ANON_KEY");
    client = createClient(supabaseUrl, anonKey);
    const { data: signInData, error } = await client.auth.signInWithPassword({
      email: seedFixtures.schoolA.ownerEmail,
      password: seedFixtures.password,
    });
    if (error || !signInData.user) throw new Error(`Sign-in failed: ${error?.message}`);
    authUserId = signInData.user.id;
  });

  it("nulls previous_data for batches committed more than 7 days ago, leaves recent ones alone", async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();

    const insertBatch = (fileName: string, committedAt: string) =>
      client
        .from("import_batch")
        .insert({
          school_id: seedFixtures.schoolA.id,
          entity_type: "student",
          match_mode: "admission_number",
          file_name: fileName,
          uploaded_by_auth_user_id: authUserId,
          is_dry_run: false,
          status: "committed",
          committed_at: committedAt,
        })
        .select("id")
        .single();

    const { data: oldBatch, error: oldBatchError } = await insertBatch("purge-test-old.csv", tenDaysAgo);
    expect(oldBatchError).toBeNull();
    const { data: recentBatch, error: recentBatchError } = await insertBatch("purge-test-recent.csv", oneDayAgo);
    expect(recentBatchError).toBeNull();

    const oldBatchId = (oldBatch as unknown as { id: string }).id;
    const recentBatchId = (recentBatch as unknown as { id: string }).id;

    const insertRow = (batchId: string) =>
      client.from("import_row").insert({
        batch_id: batchId,
        row_number: 1,
        raw_data: {},
        mapped_data: {},
        validation_status: "valid",
        action: "create",
        previous_data: { first_name: "ShouldBePurgedOrNot" },
      });

    const { error: oldRowError } = await insertRow(oldBatchId);
    expect(oldRowError).toBeNull();
    const { error: recentRowError } = await insertRow(recentBatchId);
    expect(recentRowError).toBeNull();

    const { error: purgeError } = await client.rpc("fn_purge_expired_import_snapshots");
    expect(purgeError).toBeNull();

    const { data: oldRows } = await client.from("import_row").select("previous_data").eq("batch_id", oldBatchId);
    const { data: recentRows } = await client.from("import_row").select("previous_data").eq("batch_id", recentBatchId);

    expect((oldRows as unknown as { previous_data: unknown }[])[0]?.previous_data).toBeNull();
    expect((recentRows as unknown as { previous_data: unknown }[])[0]?.previous_data).not.toBeNull();

    // No cleanup here by design: import_batch/import_row have no DELETE policy for
    // `authenticated` (batches are immutable history, same reasoning as audit_log) -- these
    // fixture rows are harmless test noise, removed via a service connection if it matters.
  });
});
