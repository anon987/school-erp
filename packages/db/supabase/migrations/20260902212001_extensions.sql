-- Extensions used across the schema.
-- pgcrypto: gen_random_uuid() for primary keys, crypt()/gen_salt() for the seed script's
-- auth.users rows (Supabase's own auth service manages real signups; the seed inserts
-- directly, which requires the same hashing the auth service uses).
create extension if not exists pgcrypto with schema extensions;
