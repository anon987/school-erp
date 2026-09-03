import { beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { seedFixtures } from "./seedFixtures";

/**
 * fn_next_school_number uses `SELECT ... FOR UPDATE` to serialize access to the counter row
 * (packages/db/supabase/migrations/20260903213505_numbering_sequence.sql). A bare
 * read-then-write from application code would hand the same number to two concurrent
 * admissions -- the only way to actually prove the fix works is genuine concurrent requests,
 * not a sequential loop (which would pass even with the race condition present, since nothing
 * would ever overlap).
 *
 * Each call here goes over its own HTTP request to PostgREST, on its own DB connection --
 * `Promise.all` gives real overlapping transactions, not just interleaved async ticks in one
 * process.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set -- see tests/README.md`);
  return value;
}

describe("fn_next_school_number concurrency", () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    const supabaseUrl = requireEnv("TEST_SUPABASE_URL");
    const anonKey = requireEnv("TEST_SUPABASE_ANON_KEY");
    client = createClient(supabaseUrl, anonKey);
    const { error } = await client.auth.signInWithPassword({
      email: seedFixtures.schoolA.ownerEmail,
      password: seedFixtures.password,
    });
    if (error) throw new Error(`Sign-in failed: ${error.message}`);
  });

  it("never issues the same number twice under concurrent load", async () => {
    const concurrency = 25;
    const calls = Array.from({ length: concurrency }, () =>
      client.rpc("fn_next_school_number", {
        p_school_id: seedFixtures.schoolA.id,
        p_sequence_key: "student_admission",
      }),
    );

    const results = await Promise.all(calls);
    const errors = results.filter((r) => r.error);
    expect(errors).toHaveLength(0);

    const numbers = results.map((r) => r.data as string);
    const uniqueNumbers = new Set(numbers);
    expect(uniqueNumbers.size).toBe(concurrency);
  });
});
