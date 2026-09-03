import { beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { seedFixtures } from "./seedFixtures";

/**
 * Replaces a `// TODO: add attendance/fees checks here later` comment with an enforced
 * assertion. Enumerates every REAL foreign key in the live schema pointing at student/staff/
 * guardian and checks each one is accounted for in import_revert_dependent_registry. Add
 * `attendance_record` with an FK to `student` in a future migration and forget to register it
 * here, and this test fails -- the build breaks, instead of shipping a revert that can silently
 * orphan attendance records.
 *
 * Known, documented blind spot: this can only discover REAL foreign keys. `document.owner_id`
 * is a polymorphic column with no FK constraint (see the documents migration for why), so it
 * cannot be found this way -- it's registered in the seed data by hand, and this test can't
 * verify that by itself. Any future polymorphic dependent needs the same manual diligence.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set -- see tests/README.md`);
  return value;
}

interface FkDependentRow {
  entity_table: string;
  dependent_table: string;
  fk_column: string;
}

interface RegistryRow {
  entity_table: string;
  dependent_table: string;
  has_real_fk: boolean;
}

const ENTITY_TABLES = ["student", "staff", "guardian"];

describe("import revert dependent registry stays in sync with the real schema", () => {
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

  it("registers every real FK-referencing table for student/staff/guardian", async () => {
    const { data: fkRows, error: fkError } = await client.rpc("fn_list_fk_dependents", {
      p_target_tables: ENTITY_TABLES,
    });
    expect(fkError).toBeNull();

    const { data: registryRows, error: registryError } = await client
      .from("import_revert_dependent_registry")
      .select("entity_table, dependent_table, has_real_fk");
    expect(registryError).toBeNull();

    const registryKeys = new Set(
      ((registryRows ?? []) as unknown as RegistryRow[])
        .filter((r) => r.has_real_fk)
        .map((r) => `${r.entity_table}.${r.dependent_table}`),
    );

    const unregistered = ((fkRows ?? []) as unknown as FkDependentRow[]).filter(
      (r) => !registryKeys.has(`${r.entity_table}.${r.dependent_table}`),
    );

    expect(
      unregistered,
      `Found FK-referencing table(s) not in import_revert_dependent_registry: ${JSON.stringify(unregistered)}. ` +
        `Add a row to that table's seeding migration before this can pass.`,
    ).toEqual([]);
  });

  it("has no stale registry rows claiming a real FK that no longer exists", async () => {
    const { data: fkRows, error: fkError } = await client.rpc("fn_list_fk_dependents", {
      p_target_tables: ENTITY_TABLES,
    });
    expect(fkError).toBeNull();

    const { data: registryRows, error: registryError } = await client
      .from("import_revert_dependent_registry")
      .select("entity_table, dependent_table, has_real_fk");
    expect(registryError).toBeNull();

    const fkKeys = new Set(
      ((fkRows ?? []) as unknown as FkDependentRow[]).map((r) => `${r.entity_table}.${r.dependent_table}`),
    );

    const stale = ((registryRows ?? []) as unknown as RegistryRow[]).filter(
      (r) => r.has_real_fk && !fkKeys.has(`${r.entity_table}.${r.dependent_table}`),
    );

    expect(stale, `Registry row(s) claim has_real_fk but no such FK exists: ${JSON.stringify(stale)}`).toEqual([]);
  });
});
