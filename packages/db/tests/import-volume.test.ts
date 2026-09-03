import { beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { generateStudents, type StudentRow } from "./generatePilotDataset";

/**
 * Runs ~2,000 realistic student rows through the REAL import pipeline (stage -> validate ->
 * commit) against the live pilot school -- not a direct SQL seed insert. This is deliberate:
 * the whole point is finding a timeout or memory problem now, with nobody watching, rather than
 * during a real onboarding session. It's also, simultaneously, how the pilot school's realistic
 * dataset actually gets created -- one dataset, one code path, not a separate synthetic test
 * fixture and a separate "real" seed.
 *
 * Requires packages/db/supabase/pilot_school_setup.sql to have been run first (creates the
 * school, master data, and owner login this test signs in as).
 */

const PILOT_SCHOOL_ID = "33333333-3333-3333-3333-333333333333";
const PILOT_OWNER_EMAIL = "owner@hansraj.schoolerp.test";
const PILOT_PASSWORD = "Seed-Test-Passw0rd!";
const STUDENT_COUNT = 2000;
const CHUNK_SIZE = 500;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set -- see tests/README.md`);
  return value;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

interface BatchCounts {
  status: string;
  total_rows: number;
  created_count: number;
  updated_count: number;
  rejected_count: number;
}

describe("import pipeline at realistic volume (~2,000 students)", () => {
  let client: SupabaseClient;
  let authUserId: string;

  beforeAll(async () => {
    const supabaseUrl = requireEnv("TEST_SUPABASE_URL");
    const anonKey = requireEnv("TEST_SUPABASE_ANON_KEY");
    client = createClient(supabaseUrl, anonKey);
    const { data, error } = await client.auth.signInWithPassword({
      email: PILOT_OWNER_EMAIL,
      password: PILOT_PASSWORD,
    });
    if (error || !data.user) {
      throw new Error(
        `Sign-in failed: ${error?.message}. Have you run ` +
          `\`supabase db query --linked --file supabase/pilot_school_setup.sql\`?`,
      );
    }
    authUserId = data.user.id;
  }, 30000);

  it(
    "stages, validates, and commits ~2,000 students with guardians in reasonable time",
    async () => {
      const students = generateStudents(STUDENT_COUNT);

      const { data: batch, error: batchError } = await client
        .from("import_batch")
        .insert({
          school_id: PILOT_SCHOOL_ID,
          entity_type: "student",
          match_mode: "none",
          file_name: "pilot-students-volume.csv",
          uploaded_by_auth_user_id: authUserId,
          is_dry_run: false,
        })
        .select("id")
        .single();
      expect(batchError).toBeNull();
      const batchId = (batch as unknown as { id: string }).id;

      // Staging: bulk-insert in chunks, not one row per round trip.
      const stageStart = Date.now();
      const chunks = chunk(students, CHUNK_SIZE);
      let rowNumber = 1;
      for (const c of chunks) {
        const rows = c.map((s: StudentRow) => ({
          batch_id: batchId,
          row_number: rowNumber++,
          raw_data: s,
          mapped_data: s,
        }));
        const { error } = await client.from("import_row").insert(rows);
        expect(error).toBeNull();
      }
      const stageMs = Date.now() - stageStart;
      console.log(`[volume] staged ${STUDENT_COUNT} rows in ${chunks.length} chunks: ${stageMs}ms`);

      const validateStart = Date.now();
      const { error: validateError } = await client.rpc("fn_validate_import_batch", { p_batch_id: batchId });
      const validateMs = Date.now() - validateStart;
      expect(validateError).toBeNull();
      console.log(`[volume] validated ${STUDENT_COUNT} rows: ${validateMs}ms`);

      const { data: afterValidate } = await client
        .from("import_batch")
        .select("status, total_rows, created_count, updated_count, rejected_count")
        .eq("id", batchId)
        .single();
      const counts = afterValidate as unknown as BatchCounts;
      console.log(`[volume] validation result:`, counts);
      expect(counts.status).toBe("validated");
      expect(counts.total_rows).toBe(STUDENT_COUNT);
      expect(counts.rejected_count).toBe(0);
      expect(counts.created_count).toBe(STUDENT_COUNT);

      // Chunked: each call commits up to p_limit not-yet-committed rows and reports how many
      // remain (see the import_commit_chunking migration for why a single call over the whole
      // batch hits the API role's statement timeout). This loop is still a handful of bulk
      // calls, not one round trip per row.
      const commitStart = Date.now();
      let chunkCalls = 0;
      let done = false;
      while (!done) {
        chunkCalls += 1;
        const { data, error } = await client.rpc("fn_commit_import_batch", {
          p_batch_id: batchId,
          p_actor_auth_user_id: authUserId,
          p_limit: 300,
        });
        expect(error).toBeNull();
        const progress = data as unknown as { remaining: number; done: boolean };
        done = progress.done;
        if (chunkCalls > 20) throw new Error("Too many commit chunk calls -- likely stuck");
      }
      const commitMs = Date.now() - commitStart;
      console.log(`[volume] committed ${STUDENT_COUNT} rows in ${chunkCalls} chunk calls: ${commitMs}ms`);

      const { count: studentCount, error: countError } = await client
        .from("student")
        .select("id", { count: "exact", head: true })
        .eq("school_id", PILOT_SCHOOL_ID);
      expect(countError).toBeNull();
      expect(studentCount).toBeGreaterThanOrEqual(STUDENT_COUNT);

      const { count: guardianLinkCount } = await client
        .from("student_guardian")
        .select("student_id", { count: "exact", head: true })
        .eq("school_id", PILOT_SCHOOL_ID);
      // 2 guardians per student.
      expect(guardianLinkCount).toBeGreaterThanOrEqual(STUDENT_COUNT * 2);

      // No hard pass/fail threshold asserted on timing -- the point of this test is to SURFACE
      // the numbers so a real timeout/memory ceiling can be judged against them, not to encode
      // an arbitrary "must be under Nms" that would be a guess about infrastructure this test
      // can't see. See this file's git history / CI logs for actual measured numbers.
    },
    600000, // 10 minute ceiling for this one test -- generous on purpose, we're MEASURING, not assuming
  );

  it(
    "reverts a small batch cleanly with ~2,000 pre-existing students in the same school",
    async () => {
      const subset = generateStudents(50, 777).map((s, idx) => ({ ...s, admission_number: "" , roll_number: String(idx + 1) }));

      const { count: countBefore } = await client
        .from("student")
        .select("id", { count: "exact", head: true })
        .eq("school_id", PILOT_SCHOOL_ID);

      const { data: batch, error: batchError } = await client
        .from("import_batch")
        .insert({
          school_id: PILOT_SCHOOL_ID,
          entity_type: "student",
          match_mode: "none",
          file_name: "pilot-students-subset-revert.csv",
          uploaded_by_auth_user_id: authUserId,
          is_dry_run: false,
        })
        .select("id")
        .single();
      expect(batchError).toBeNull();
      const batchId = (batch as unknown as { id: string }).id;

      const rows = subset.map((s: StudentRow, idx: number) => ({
        batch_id: batchId,
        row_number: idx + 1,
        raw_data: s,
        mapped_data: s,
      }));
      const { error: insertError } = await client.from("import_row").insert(rows);
      expect(insertError).toBeNull();

      const { error: validateError } = await client.rpc("fn_validate_import_batch", { p_batch_id: batchId });
      expect(validateError).toBeNull();

      const { data: commitData, error: commitError } = await client.rpc("fn_commit_import_batch", {
        p_batch_id: batchId,
        p_actor_auth_user_id: authUserId,
        p_limit: 300,
      });
      expect(commitError).toBeNull();
      expect((commitData as unknown as { done: boolean }).done).toBe(true);

      const revertStart = Date.now();
      const { data: revertData, error: revertError } = await client.rpc("fn_revert_import_batch", {
        p_batch_id: batchId,
        p_actor_auth_user_id: authUserId,
      });
      const revertMs = Date.now() - revertStart;
      expect(revertError).toBeNull();
      console.log(`[volume] reverted a 50-row batch with ~2,000 pre-existing students present: ${revertMs}ms`);

      const result = revertData as unknown as { reverted: boolean; blockers: unknown[] };
      expect(result.blockers).toEqual([]);
      expect(result.reverted).toBe(true);

      const { count: totalAfterRevert } = await client
        .from("student")
        .select("id", { count: "exact", head: true })
        .eq("school_id", PILOT_SCHOOL_ID);
      // Delta-based, not compared against the global STUDENT_COUNT constant: this suite runs
      // against a live, persistent database that other runs/tests may have already added
      // students to, so "back to exactly 2,000" would be a fragile assumption. What must hold
      // is "commit added 50, revert removed exactly those 50."
      expect(totalAfterRevert).toBe(countBefore);
    },
    60000,
  );
});
