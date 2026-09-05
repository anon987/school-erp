import { beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { seedFixtures } from "./seedFixtures";

/**
 * Extends the P0/P1 cross-school RLS suites to the Attendance tables (packages/db attendance +
 * holiday_calendar migrations): attendance_record, staff_attendance_record,
 * attendance_threshold_setting, holiday, plus the two RPCs (fn_mark_section_attendance,
 * fn_attendance_percentages). Same pattern as rls-isolation-students-staff.test.ts: unfiltered
 * reads must not leak, explicit cross-school reads/writes must be denied, and a positive control
 * proves the policy isn't just accidentally denying everything.
 *
 * seedFixtures' two owners both hold the school_owner role, which the attendance migration grants
 * attendance.manage -- so both are valid "can write their own school's attendance" positive
 * controls, and neither's mark_own_class/same-day window applies (manage bypasses it), keeping
 * this suite about tenant isolation, not the ownership/date-window rules (those are exercised by
 * the server action layer, not RLS alone).
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
  attendanceRecordId: string;
  staffAttendanceRecordId: string;
  holidayId: string;
}

async function setUpFixture(client: SupabaseClient, schoolId: string, tag: string): Promise<Fixture> {
  const authUserId = (await client.auth.getUser()).data.user!.id;

  const { data: year } = await client
    .from("academic_year")
    .insert({ school_id: schoolId, name: `ATT-${tag}`, start_date: "2026-04-01", end_date: "2027-03-31" })
    .select("id")
    .single();
  const academicYearId = (year as unknown as { id: string }).id;

  const { data: cls } = await client.from("class").insert({ school_id: schoolId, name: `ATT-${tag}`, sort_order: 1 }).select("id").single();
  const classId = (cls as unknown as { id: string }).id;

  const { data: section } = await client.from("section").insert({ school_id: schoolId, class_id: classId, name: "X" }).select("id").single();
  const sectionId = (section as unknown as { id: string }).id;

  const { data: student } = await client
    .from("student")
    .insert({ school_id: schoolId, admission_number: `ATT-STU-${tag}`, first_name: "Test", last_name: tag })
    .select("id")
    .single();
  const studentId = (student as unknown as { id: string }).id;

  await client
    .from("enrollment")
    .insert({ school_id: schoolId, student_id: studentId, academic_year_id: academicYearId, class_id: classId, section_id: sectionId });

  const { data: staff } = await client
    .from("staff")
    .insert({ school_id: schoolId, employee_code: `ATT-EMP-${tag}`, first_name: "Test", last_name: tag, joining_date: "2020-01-01" })
    .select("id")
    .single();
  const staffId = (staff as unknown as { id: string }).id;

  const today = new Date().toISOString().slice(0, 10);

  const { data: attendanceRecord, error: attendanceRecordError } = await client
    .from("attendance_record")
    .insert({
      school_id: schoolId,
      student_id: studentId,
      academic_year_id: academicYearId,
      class_id: classId,
      section_id: sectionId,
      attendance_date: today,
      status: "present",
      marked_by_auth_user_id: authUserId,
    })
    .select("id")
    .single();
  if (attendanceRecordError) throw new Error(`attendance_record insert failed (positive control setup): ${attendanceRecordError.message}`);
  const attendanceRecordId = (attendanceRecord as unknown as { id: string }).id;

  const { data: staffAttendanceRecord } = await client
    .from("staff_attendance_record")
    .insert({ school_id: schoolId, staff_id: staffId, attendance_date: today, status: "present", marked_by_auth_user_id: authUserId })
    .select("id")
    .single();
  const staffAttendanceRecordId = (staffAttendanceRecord as unknown as { id: string }).id;

  const { data: holiday } = await client
    .from("holiday")
    .insert({ school_id: schoolId, date: `2026-12-${tag.endsWith("A") ? "25" : "26"}`, name: `Holiday-${tag}` })
    .select("id")
    .single();
  const holidayId = (holiday as unknown as { id: string }).id;

  await client.from("attendance_threshold_setting").upsert({ school_id: schoolId, threshold_percent: 80 }, { onConflict: "school_id" });

  return { academicYearId, classId, sectionId, studentId, attendanceRecordId, staffAttendanceRecordId, holidayId };
}

describe("cross-school RLS isolation: attendance", () => {
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;
  let fixtureA: Fixture;
  let fixtureB: Fixture;

  beforeAll(async () => {
    const url = requireEnv("TEST_SUPABASE_URL");
    const key = requireEnv("TEST_SUPABASE_ANON_KEY");
    clientA = await signInAs(url, key, seedFixtures.schoolA.ownerEmail);
    clientB = await signInAs(url, key, seedFixtures.schoolB.ownerEmail);
    const runTag = Date.now().toString(36);
    fixtureA = await setUpFixture(clientA, seedFixtures.schoolA.id, `A${runTag}`);
    fixtureB = await setUpFixture(clientB, seedFixtures.schoolB.id, `B${runTag}`);
  }, 30000);

  it("positive control: the caller CAN read their own school's attendance_record", async () => {
    const { data, error } = await clientA.from("attendance_record").select("id").eq("id", fixtureA.attendanceRecordId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("denies an explicit cross-school read of attendance_record", async () => {
    const { data, error } = await clientA.from("attendance_record").select("id").eq("id", fixtureB.attendanceRecordId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("returns only the caller's own attendance_record rows on an unfiltered select", async () => {
    const { data, error } = await clientA.from("attendance_record").select("id");
    expect(error).toBeNull();
    const ids = (data ?? []).map((r) => (r as unknown as { id: string }).id);
    expect(ids).toContain(fixtureA.attendanceRecordId);
    expect(ids).not.toContain(fixtureB.attendanceRecordId);
  });

  it("is symmetric: School B cannot see School A's attendance_record either", async () => {
    const { data, error } = await clientB.from("attendance_record").select("id").eq("id", fixtureA.attendanceRecordId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("denies a direct cross-school write of attendance_record (school_id mismatch fails the with-check)", async () => {
    const authUserId = (await clientA.auth.getUser()).data.user!.id;
    const { error } = await clientA.from("attendance_record").insert({
      school_id: seedFixtures.schoolB.id,
      student_id: fixtureB.studentId,
      academic_year_id: fixtureB.academicYearId,
      class_id: fixtureB.classId,
      section_id: fixtureB.sectionId,
      attendance_date: new Date().toISOString().slice(0, 10),
      status: "present",
      marked_by_auth_user_id: authUserId,
    });
    expect(error).not.toBeNull();
  });

  it("denies an explicit cross-school read of staff_attendance_record", async () => {
    const { data, error } = await clientA.from("staff_attendance_record").select("id").eq("id", fixtureB.staffAttendanceRecordId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("denies an explicit cross-school read of holiday", async () => {
    const { data, error } = await clientA.from("holiday").select("id").eq("id", fixtureB.holidayId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("denies an explicit cross-school read of attendance_threshold_setting", async () => {
    const { data, error } = await clientA.from("attendance_threshold_setting").select("school_id").eq("school_id", seedFixtures.schoolB.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("fn_mark_section_attendance fails when called against another school's section, not a silent no-op", async () => {
    const authUserId = (await clientA.auth.getUser()).data.user!.id;
    const { error } = await clientA.rpc("fn_mark_section_attendance", {
      p_school_id: seedFixtures.schoolB.id,
      p_section_id: fixtureB.sectionId,
      p_class_id: fixtureB.classId,
      p_academic_year_id: fixtureB.academicYearId,
      p_attendance_date: new Date().toISOString().slice(0, 10),
      p_marked_by_auth_user_id: authUserId,
      p_marks: [{ student_id: fixtureB.studentId, status: "present" }],
    });
    // RLS on the underlying insert rejects it (with-check requires school_id = current_school_id()) --
    // the function itself has no additional guard, RLS is the backstop, so this proves RLS is
    // actually wired to a SECURITY INVOKER call path, not just to direct table access.
    expect(error).not.toBeNull();
  });

  it("fn_attendance_percentages returns nothing for another school's academic year, even in your own session", async () => {
    const { data, error } = await clientA.rpc("fn_attendance_percentages", {
      p_school_id: seedFixtures.schoolB.id,
      p_academic_year_id: fixtureB.academicYearId,
    });
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
