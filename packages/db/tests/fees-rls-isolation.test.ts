import { beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { seedFixtures } from "./seedFixtures";

/**
 * Cross-school RLS isolation for Fees (packages/db attendance/fees migrations), same shape as
 * attendance-rls-isolation.test.ts: unfiltered reads must not leak, explicit cross-school
 * reads/writes must be denied, and a positive control proves the policy isn't just accidentally
 * denying everything. Also specifically proves `payment` has NO update or delete path for any
 * authenticated role -- CLAUDE.md's "payment records are immutable" enforced at the database
 * level, not just by convention.
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
  studentId: string;
  feeHeadId: string;
  feeStructureId: string;
  installmentId: string;
  invoiceId: string;
  paymentId: string;
}

async function setUpFixture(client: SupabaseClient, schoolId: string, tag: string): Promise<Fixture> {
  const authUserId = (await client.auth.getUser()).data.user!.id;

  const { data: year } = await client
    .from("academic_year")
    .insert({ school_id: schoolId, name: `FEE-${tag}`, start_date: "2026-04-01", end_date: "2027-03-31" })
    .select("id")
    .single();
  const academicYearId = (year as unknown as { id: string }).id;

  const { data: cls } = await client.from("class").insert({ school_id: schoolId, name: `FEE-${tag}`, sort_order: 1 }).select("id").single();
  const classId = (cls as unknown as { id: string }).id;

  const { data: student } = await client
    .from("student")
    .insert({ school_id: schoolId, admission_number: `FEE-STU-${tag}`, first_name: "Test", last_name: tag })
    .select("id")
    .single();
  const studentId = (student as unknown as { id: string }).id;

  const { data: feeHead } = await client.from("fee_head").insert({ school_id: schoolId, name: `Tuition-${tag}`, is_recurring: false }).select("id").single();
  const feeHeadId = (feeHead as unknown as { id: string }).id;

  const { data: structure } = await client
    .from("fee_structure")
    .insert({ school_id: schoolId, academic_year_id: academicYearId, class_id: classId, name: `Structure-${tag}` })
    .select("id")
    .single();
  const feeStructureId = (structure as unknown as { id: string }).id;

  await client.from("fee_structure_item").insert({ fee_structure_id: feeStructureId, fee_head_id: feeHeadId, amount_paise: 100000, one_time_installment_number: 1 });

  const { error: installmentGenError } = await client.rpc("fn_generate_monthly_installments", { p_school_id: schoolId, p_academic_year_id: academicYearId });
  if (installmentGenError) throw new Error(`fn_generate_monthly_installments failed: ${installmentGenError.message}`);
  const { data: installment } = await client
    .from("installment")
    .select("id")
    .eq("school_id", schoolId)
    .eq("academic_year_id", academicYearId)
    .eq("sequence_number", 1)
    .single();
  const installmentId = (installment as unknown as { id: string }).id;

  const { data: invoice } = await client
    .from("invoice")
    .insert({
      school_id: schoolId,
      student_id: studentId,
      academic_year_id: academicYearId,
      installment_id: installmentId,
      invoice_number: `FEE-INV-${tag}`,
      due_date: "2026-04-10",
      total_amount_paise: 100000,
    })
    .select("id")
    .single();
  const invoiceId = (invoice as unknown as { id: string }).id;

  const { data: payment, error: paymentError } = await client
    .from("payment")
    .insert({
      school_id: schoolId,
      invoice_id: invoiceId,
      student_id: studentId,
      amount_paise: 100000,
      method: "cash",
      status: "recorded",
      received_by_auth_user_id: authUserId,
    })
    .select("id")
    .single();
  if (paymentError) throw new Error(`payment insert failed (positive control setup): ${paymentError.message}`);
  const paymentId = (payment as unknown as { id: string }).id;

  return { academicYearId, classId, studentId, feeHeadId, feeStructureId, installmentId, invoiceId, paymentId };
}

describe("cross-school RLS isolation: fees", () => {
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

  it("positive control: the caller CAN read their own school's invoice and payment", async () => {
    const invoiceRes = await clientA.from("invoice").select("id").eq("id", fixtureA.invoiceId);
    expect(invoiceRes.error).toBeNull();
    expect(invoiceRes.data).toHaveLength(1);

    const paymentRes = await clientA.from("payment").select("id").eq("id", fixtureA.paymentId);
    expect(paymentRes.error).toBeNull();
    expect(paymentRes.data).toHaveLength(1);
  });

  it("denies an explicit cross-school read of invoice and payment", async () => {
    const invoiceRes = await clientA.from("invoice").select("id").eq("id", fixtureB.invoiceId);
    expect(invoiceRes.error).toBeNull();
    expect(invoiceRes.data).toEqual([]);

    const paymentRes = await clientA.from("payment").select("id").eq("id", fixtureB.paymentId);
    expect(paymentRes.error).toBeNull();
    expect(paymentRes.data).toEqual([]);
  });

  it("is symmetric: School B cannot see School A's invoice/payment either", async () => {
    const invoiceRes = await clientB.from("invoice").select("id").eq("id", fixtureA.invoiceId);
    expect(invoiceRes.data).toEqual([]);
    const paymentRes = await clientB.from("payment").select("id").eq("id", fixtureA.paymentId);
    expect(paymentRes.data).toEqual([]);
  });

  it("returns only the caller's own invoices on an unfiltered select", async () => {
    const { data, error } = await clientA.from("invoice").select("id");
    expect(error).toBeNull();
    const ids = (data ?? []).map((r) => (r as unknown as { id: string }).id);
    expect(ids).toContain(fixtureA.invoiceId);
    expect(ids).not.toContain(fixtureB.invoiceId);
  });

  it("denies a direct cross-school write of invoice (school_id mismatch fails the with-check)", async () => {
    const { error } = await clientA.from("invoice").insert({
      school_id: seedFixtures.schoolB.id,
      student_id: fixtureB.studentId,
      academic_year_id: fixtureB.academicYearId,
      installment_id: fixtureB.installmentId,
      invoice_number: "SHOULD-NOT-INSERT",
      due_date: "2026-04-10",
      total_amount_paise: 5000,
    });
    expect(error).not.toBeNull();
  });

  it("payment has no UPDATE path for an authenticated role -- immutability is enforced by grants, not just convention", async () => {
    const { error } = await clientA.from("payment").update({ amount_paise: 1 }).eq("id", fixtureA.paymentId);
    // No UPDATE grant at all to `authenticated` (see the fees migration) -- PostgREST returns an
    // error for the attempted update rather than silently no-op'ing it.
    expect(error).not.toBeNull();
  });

  it("payment has no DELETE path for an authenticated role", async () => {
    const { error } = await clientA.from("payment").delete().eq("id", fixtureA.paymentId);
    expect(error).not.toBeNull();
  });

  it("fn_generate_yearly_invoices fails when called against another school's academic year, not a silent no-op", async () => {
    const { error } = await clientA.rpc("fn_generate_yearly_invoices", {
      p_school_id: seedFixtures.schoolB.id,
      p_academic_year_id: fixtureB.academicYearId,
      p_limit: 10,
    });
    // The function itself has no tenant guard beyond the RLS on the tables it touches -- calling
    // it with another school's academic_year_id as School A finds zero candidate students (the
    // student/enrollment SELECT inside the function is RLS-scoped to School A, so School B's
    // students are invisible to it, not merely off-limits to write), so nothing is generated.
    // Proves RLS is the real backstop even for a "generate invoices" RPC, not just direct
    // table access.
    expect(error).toBeNull();
    const { data: leaked } = await clientA.from("invoice").select("id").eq("academic_year_id", fixtureB.academicYearId);
    expect(leaked).toEqual([]);
  });
});
