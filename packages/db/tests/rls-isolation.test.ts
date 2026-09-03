import { beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { seedFixtures } from "./seedFixtures";

// Not typed with `Database` yet -- see the comment in apps/worker/src/supabaseAdmin.ts.
type Client = SupabaseClient;

/**
 * Proves the RLS policy itself blocks cross-school reads -- not just that the app happens not
 * to ask for other schools' rows. Every query below either omits a school_id filter entirely
 * (proving the database, not the client, is doing the filtering) or explicitly asks for the
 * other school's data (proving the policy denies it even when asked directly, which is the
 * scenario that actually matters: a bug or a malicious client that DOES construct a
 * cross-tenant query).
 *
 * Requires a database with the seed applied (`supabase db reset` runs seed.sql automatically)
 * and TEST_SUPABASE_URL / TEST_SUPABASE_ANON_KEY set -- see tests/README.md.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Run \`supabase status\` against a database seeded via ` +
        `\`supabase db reset\` and put its API URL / anon key in packages/db/.env.test -- see tests/README.md.`,
    );
  }
  return value;
}

let supabaseUrl: string;
let anonKey: string;

async function signInAs(email: string): Promise<Client> {
  const client = createClient(supabaseUrl, anonKey);
  const { error } = await client.auth.signInWithPassword({ email, password: seedFixtures.password });
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}`);
  return client;
}

function decodeRoleAndSchool(accessToken: string): { school_id?: string; roles?: string[] } {
  const payload = accessToken.split(".")[1];
  if (!payload) throw new Error("Access token has no payload segment");
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
}

describe("cross-school RLS isolation", () => {
  let clientA: Client;
  let clientB: Client;

  beforeAll(async () => {
    supabaseUrl = requireEnv("TEST_SUPABASE_URL");
    anonKey = requireEnv("TEST_SUPABASE_ANON_KEY");
    clientA = await signInAs(seedFixtures.schoolA.ownerEmail);
    clientB = await signInAs(seedFixtures.schoolB.ownerEmail);
  });

  it("stamps the correct school_id and roles onto the JWT (custom_access_token_hook)", async () => {
    const { data } = await clientA.auth.getSession();
    const claims = decodeRoleAndSchool(data.session!.access_token);
    expect(claims.school_id).toBe(seedFixtures.schoolA.id);
    expect(claims.roles).toContain("school_owner");
  });

  it("returns only the caller's own school row on an unfiltered select (school)", async () => {
    const { data, error } = await clientA.from("school").select("id");
    expect(error).toBeNull();
    const ids = ((data ?? []) as unknown as { id: string }[]).map((r) => r.id);
    expect(ids).toContain(seedFixtures.schoolA.id);
    expect(ids).not.toContain(seedFixtures.schoolB.id);
  });

  it("returns only the caller's own campus on an unfiltered select (campus)", async () => {
    const { data, error } = await clientA.from("campus").select("id, school_id");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.school_id).toBe(seedFixtures.schoolA.id);
  });

  it("denies an EXPLICIT cross-school query, not just an unfiltered one (campus)", async () => {
    const { data, error } = await clientA
      .from("campus")
      .select("id")
      .eq("id", seedFixtures.schoolB.campusId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("denies an explicit cross-school read of school_branding", async () => {
    const { data, error } = await clientA
      .from("school_branding")
      .select("school_id, display_name")
      .eq("school_id", seedFixtures.schoolB.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("denies an explicit cross-school read of the school row itself", async () => {
    const { data, error } = await clientA.from("school").select("id").eq("id", seedFixtures.schoolB.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("is symmetric: School B's owner cannot see School A's data either", async () => {
    const { data, error } = await clientB
      .from("campus")
      .select("id")
      .eq("id", seedFixtures.schoolA.campusId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("positive control: the caller CAN read their own school's branding", async () => {
    const { data, error } = await clientA
      .from("school_branding")
      .select("school_id, display_name")
      .eq("school_id", seedFixtures.schoolA.id);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });
});
