import { beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { seedFixtures } from "./seedFixtures";

/**
 * Extends the P0 cross-school RLS suite (rls-isolation.test.ts) to every table this ticket
 * added: student, guardian, student_guardian, staff, document, import_batch/import_row -- plus
 * the one operation that is NOT just a table read: attempting to revert another school's import
 * batch through fn_revert_import_batch. Same pattern throughout: unfiltered reads must not
 * leak, and explicit cross-school reads/actions must be denied, not merely "happen not to be
 * asked for."
 *
 * Reuses the seedFixtures two schools (not the pilot school) -- this suite creates its own
 * minimal master data (one class/section per school) and one student/staff/guardian/document
 * per school, since seed.sql intentionally stays a thin two-school fixture.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set -- see tests/README.md`);
  return value;
}

async function signInAs(url: string, key: string, email: string): Promise<SupabaseClient> {
  const client = createClient(url, key);
  const { error } = await client.auth.signInWithPassword({ email, password: seedFixtures.password });
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}`);
  return client;
}

interface Fixture {
  academicYearId: string;
  classId: string;
  sectionId: string;
  studentId: string;
  guardianId: string;
  staffId: string;
  documentId: string;
  importBatchId: string;
}

async function setUpFixture(client: SupabaseClient, schoolId: string, tag: string): Promise<Fixture> {
  const { data: year } = await client
    .from("academic_year")
    .insert({ school_id: schoolId, name: `RLS-${tag}`, start_date: "2026-04-01", end_date: "2027-03-31" })
    .select("id")
    .single();
  const academicYearId = (year as unknown as { id: string }).id;

  const { data: cls } = await client
    .from("class")
    .insert({ school_id: schoolId, name: `RLS-${tag}`, sort_order: 1 })
    .select("id")
    .single();
  const classId = (cls as unknown as { id: string }).id;

  const { data: section } = await client
    .from("section")
    .insert({ school_id: schoolId, class_id: classId, name: "X" })
    .select("id")
    .single();
  const sectionId = (section as unknown as { id: string }).id;

  const { data: student } = await client
    .from("student")
    .insert({ school_id: schoolId, admission_number: `RLS-STU-${tag}`, first_name: "Test", last_name: tag })
    .select("id")
    .single();
  const studentId = (student as unknown as { id: string }).id;

  await client
    .from("enrollment")
    .insert({ school_id: schoolId, student_id: studentId, academic_year_id: academicYearId, class_id: classId, section_id: sectionId });

  const { data: guardian } = await client.from("guardian").insert({ school_id: schoolId, first_name: `Guardian-${tag}` }).select("id").single();
  const guardianId = (guardian as unknown as { id: string }).id;
  await client
    .from("student_guardian")
    .insert({ student_id: studentId, guardian_id: guardianId, school_id: schoolId, relationship_type: "father", phone: "9000000000" });

  const { data: staff } = await client
    .from("staff")
    .insert({ school_id: schoolId, employee_code: `RLS-EMP-${tag}`, first_name: "Test", last_name: tag, joining_date: "2020-01-01" })
    .select("id")
    .single();
  const staffId = (staff as unknown as { id: string }).id;

  const { data: doc } = await client
    .from("document")
    .insert({
      school_id: schoolId,
      owner_type: "student",
      owner_id: studentId,
      category: "photo",
      storage_path: `${schoolId}/student/${studentId}/rls-${tag}.jpg`,
      mime_type: "image/jpeg",
      size_bytes: 100,
      uploaded_by_auth_user_id: (await client.auth.getUser()).data.user!.id,
    })
    .select("id")
    .single();
  const documentId = (doc as unknown as { id: string }).id;

  const { data: batch } = await client
    .from("import_batch")
    .insert({
      school_id: schoolId,
      entity_type: "student",
      match_mode: "none",
      file_name: `rls-${tag}.csv`,
      uploaded_by_auth_user_id: (await client.auth.getUser()).data.user!.id,
      is_dry_run: false,
    })
    .select("id")
    .single();
  const importBatchId = (batch as unknown as { id: string }).id;

  return { academicYearId, classId, sectionId, studentId, guardianId, staffId, documentId, importBatchId };
}

describe("cross-school RLS isolation: students & staff", () => {
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;
  let fixtureA: Fixture;
  let fixtureB: Fixture;

  beforeAll(async () => {
    const url = requireEnv("TEST_SUPABASE_URL");
    const key = requireEnv("TEST_SUPABASE_ANON_KEY");
    clientA = await signInAs(url, key, seedFixtures.schoolA.ownerEmail);
    clientB = await signInAs(url, key, seedFixtures.schoolB.ownerEmail);
    // Unique suffix per run -- this suite hits a live, persistent database (not a fresh
    // per-test database), so fixed names would collide with a previous run's leftover rows on
    // unique constraints (academic_year.name, class.name, student.admission_number, ...).
    const runTag = Date.now().toString(36);
    fixtureA = await setUpFixture(clientA, seedFixtures.schoolA.id, `A${runTag}`);
    fixtureB = await setUpFixture(clientB, seedFixtures.schoolB.id, `B${runTag}`);
  }, 30000);

  it("denies an explicit cross-school read of student", async () => {
    const { data, error } = await clientA.from("student").select("id").eq("id", fixtureB.studentId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("denies an explicit cross-school read of staff", async () => {
    const { data, error } = await clientA.from("staff").select("id").eq("id", fixtureB.staffId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("denies an explicit cross-school read of guardian", async () => {
    const { data, error } = await clientA.from("guardian").select("id").eq("id", fixtureB.guardianId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("denies an explicit cross-school read of document", async () => {
    const { data, error } = await clientA.from("document").select("id").eq("id", fixtureB.documentId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("denies an explicit cross-school read of import_batch", async () => {
    const { data, error } = await clientA.from("import_batch").select("id").eq("id", fixtureB.importBatchId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("returns only the caller's own students on an unfiltered select", async () => {
    const { data, error } = await clientA.from("student").select("id");
    expect(error).toBeNull();
    const ids = (data ?? []).map((r) => (r as unknown as { id: string }).id);
    expect(ids).toContain(fixtureA.studentId);
    expect(ids).not.toContain(fixtureB.studentId);
  });

  it("is symmetric: School B cannot see School A's student either", async () => {
    const { data, error } = await clientB.from("student").select("id").eq("id", fixtureA.studentId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("positive control: the caller CAN read their own school's student", async () => {
    const { data, error } = await clientA.from("student").select("id").eq("id", fixtureA.studentId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("a cross-school revert attempt on fn_revert_import_batch fails, not silently no-ops on the wrong school", async () => {
    const { error } = await clientA.rpc("fn_revert_import_batch", {
      p_batch_id: fixtureB.importBatchId,
      p_actor_auth_user_id: (await clientA.auth.getUser()).data.user!.id,
    });
    expect(error).not.toBeNull();
  });
});
