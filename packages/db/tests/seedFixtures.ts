/**
 * Mirrors the fixed UUIDs in supabase/seed.sql. Kept in one place so the test and the seed
 * script can't drift silently -- if you rename an ID in one, TypeScript/grep will surface the
 * other.
 */
export const seedFixtures = {
  schoolA: {
    id: "11111111-1111-1111-1111-111111111111",
    campusId: "11111111-1111-1111-1111-111111111112",
    ownerEmail: "owner.a@seed.schoolerp.test",
  },
  schoolB: {
    id: "22222222-2222-2222-2222-222222222222",
    campusId: "22222222-2222-2222-2222-222222222223",
    ownerEmail: "owner.b@seed.schoolerp.test",
  },
  password: "Seed-Test-Passw0rd!",
} as const;
