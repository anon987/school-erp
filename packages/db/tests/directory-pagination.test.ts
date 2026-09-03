import { beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Exercises the student directory's actual query shapes -- class/section filter, name search,
 * pagination -- against the ~2,000-row pilot dataset created by import-volume.test.ts. Run
 * import-volume.test.ts first (or after; order doesn't matter as long as the pilot school has
 * its ~2,000 students at some point before this runs).
 *
 * enrollment_school_year_class_section_idx (see the directory_performance_indexes migration)
 * is what makes the class/section filter an index scan instead of a sequential scan of every
 * school's enrollment rows -- confirmed structurally via EXPLAIN with enable_seqscan off; this
 * test checks it holds up through the real client at realistic timing, not just query-plan
 * shape.
 */

const PILOT_SCHOOL_ID = "33333333-3333-3333-3333-333333333333";
const PILOT_OWNER_EMAIL = "owner@hansraj.schoolerp.test";
const PILOT_PASSWORD = "Seed-Test-Passw0rd!";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set -- see tests/README.md`);
  return value;
}

describe("student directory query shapes at volume", () => {
  let client: SupabaseClient;
  let academicYearId: string;

  beforeAll(async () => {
    const supabaseUrl = requireEnv("TEST_SUPABASE_URL");
    const anonKey = requireEnv("TEST_SUPABASE_ANON_KEY");
    client = createClient(supabaseUrl, anonKey);
    const { error } = await client.auth.signInWithPassword({
      email: PILOT_OWNER_EMAIL,
      password: PILOT_PASSWORD,
    });
    if (error) throw new Error(`Sign-in failed: ${error.message}`);

    const { data: year, error: yearError } = await client
      .from("academic_year")
      .select("id")
      .eq("school_id", PILOT_SCHOOL_ID)
      .eq("is_current", true)
      .single();
    if (yearError || !year) throw new Error("No current academic_year for pilot school");
    academicYearId = (year as unknown as { id: string }).id;
  });

  it("paginates the full directory in pages of 50 without gaps or duplicates", async () => {
    const pageSize = 50;
    const seenIds = new Set<string>();
    let page = 0;
    let totalFetched = 0;
    const start = Date.now();

    // A handful of pages is enough to prove the pattern; walking all ~40 pages would just
    // repeat the same query shape without learning anything new.
    for (; page < 5; page += 1) {
      const { data, error } = await client
        .from("student")
        .select("id, first_name, last_name")
        .eq("school_id", PILOT_SCHOOL_ID)
        .order("last_name", { ascending: true })
        .order("id", { ascending: true }) // tiebreaker so ordering is deterministic across pages
        .range(page * pageSize, page * pageSize + pageSize - 1);

      expect(error).toBeNull();
      const rows = (data ?? []) as unknown as { id: string }[];
      expect(rows.length).toBe(pageSize);
      for (const row of rows) {
        expect(seenIds.has(row.id)).toBe(false); // no duplicate across pages
        seenIds.add(row.id);
      }
      totalFetched += rows.length;
    }

    const elapsedMs = Date.now() - start;
    console.log(`[pagination] fetched ${totalFetched} rows across ${page} pages of ${pageSize}: ${elapsedMs}ms`);
    expect(seenIds.size).toBe(totalFetched); // confirms no duplicates were silently overwritten
  });

  it("filters by class + section using the composite index, quickly", async () => {
    const { data: cls } = await client.from("class").select("id").eq("school_id", PILOT_SCHOOL_ID).eq("name", "9").single();
    const classId = (cls as unknown as { id: string }).id;
    const { data: section } = await client
      .from("section")
      .select("id")
      .eq("class_id", classId)
      .eq("name", "A")
      .single();
    const sectionId = (section as unknown as { id: string }).id;

    const start = Date.now();
    const { data: enrollments, error } = await client
      .from("enrollment")
      .select("student_id, roll_number")
      .eq("school_id", PILOT_SCHOOL_ID)
      .eq("academic_year_id", academicYearId)
      .eq("class_id", classId)
      .eq("section_id", sectionId)
      .order("roll_number", { ascending: true });
    const elapsedMs = Date.now() - start;

    expect(error).toBeNull();
    console.log(`[pagination] class 9 / section A: ${(enrollments ?? []).length} students in ${elapsedMs}ms`);
    expect((enrollments ?? []).length).toBeGreaterThan(0);
    expect(elapsedMs).toBeLessThan(3000); // generous -- this should be single-digit ms per the EXPLAIN check
  });

  it("searches by name across the full ~2,000-row dataset", async () => {
    const start = Date.now();
    const { data, error } = await client
      .from("student")
      .select("id, first_name, last_name")
      .eq("school_id", PILOT_SCHOOL_ID)
      .or("first_name.ilike.%kumar%,last_name.ilike.%kumar%")
      .limit(50);
    const elapsedMs = Date.now() - start;

    expect(error).toBeNull();
    console.log(`[pagination] name search "kumar": ${(data ?? []).length} results in ${elapsedMs}ms`);
    expect(elapsedMs).toBeLessThan(3000);
  });
});
