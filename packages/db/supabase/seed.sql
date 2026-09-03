-- Dev/test seed data: two schools, each with a campus, branding, and one signed-in-capable
-- owner. This is what the cross-school RLS test in apps/web/tests/rls-isolation.test.ts signs
-- in against -- keeping it in seed.sql (not only inline in the test) means the isolation
-- scenario is reproducible on any fresh database with `supabase db reset`, not just inside CI.
--
-- Dev-only: fixed UUIDs and a fixed password, never run against a real school's database.
-- Inserting directly into auth.users/auth.identities (rather than going through GoTrue) is a
-- local-seeding shortcut; real signups always go through Supabase Auth.

do $$
declare
  v_school_a uuid := '11111111-1111-1111-1111-111111111111';
  v_school_b uuid := '22222222-2222-2222-2222-222222222222';
  v_campus_a uuid := '11111111-1111-1111-1111-111111111112';
  v_campus_b uuid := '22222222-2222-2222-2222-222222222223';
  v_user_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_user_b uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_platform_admin uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  v_member_a uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  v_member_b uuid := 'bbbbbbbb-0000-0000-0000-000000000001';
  v_password text := 'Seed-Test-Passw0rd!';
begin

  -- ---------------------------------------------------------------------
  -- Global identities (auth.users + auth.identities + user_profile)
  -- ---------------------------------------------------------------------
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values
    ('00000000-0000-0000-0000-000000000000', v_user_a, 'authenticated', 'authenticated',
     'owner.a@seed.schoolerp.test', extensions.crypt(v_password, extensions.gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_user_b, 'authenticated', 'authenticated',
     'owner.b@seed.schoolerp.test', extensions.crypt(v_password, extensions.gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_platform_admin, 'authenticated', 'authenticated',
     'platform.admin@seed.schoolerp.test', extensions.crypt(v_password, extensions.gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '')
  on conflict (id) do nothing;

  -- Assumes auth.identities has a unique constraint on (provider_id, provider), which is the
  -- current Supabase Auth schema. If `supabase db reset` fails here with "no unique or
  -- exclusion constraint matching the ON CONFLICT specification," check
  -- `\d auth.identities` and adjust the conflict target -- this was the one part of this file
  -- not exercised against a live database before being committed (see packages/db/README.md).
  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values
    (gen_random_uuid(), v_user_a, v_user_a::text,
     jsonb_build_object('sub', v_user_a::text, 'email', 'owner.a@seed.schoolerp.test'),
     'email', now(), now(), now()),
    (gen_random_uuid(), v_user_b, v_user_b::text,
     jsonb_build_object('sub', v_user_b::text, 'email', 'owner.b@seed.schoolerp.test'),
     'email', now(), now(), now()),
    (gen_random_uuid(), v_platform_admin, v_platform_admin::text,
     jsonb_build_object('sub', v_platform_admin::text, 'email', 'platform.admin@seed.schoolerp.test'),
     'email', now(), now(), now())
  on conflict (provider_id, provider) do nothing;

  insert into public.user_profile (auth_user_id, phone, display_name, email) values
    (v_user_a, '+919415000001', 'Seed Owner A', 'owner.a@seed.schoolerp.test'),
    (v_user_b, '+919415000002', 'Seed Owner B', 'owner.b@seed.schoolerp.test'),
    (v_platform_admin, '+919415000000', 'Seed Platform Admin', 'platform.admin@seed.schoolerp.test')
  on conflict (auth_user_id) do nothing;

  insert into public.platform_admin (auth_user_id) values (v_platform_admin)
  on conflict (auth_user_id) do nothing;

  -- ---------------------------------------------------------------------
  -- School A
  -- ---------------------------------------------------------------------
  insert into public.school (id, legal_name, board, address, contact_phone, contact_email)
  values (v_school_a, 'Seed School A', 'UP Board', 'Jaunpur, UP', '+919415000010', 'contact@seed-a.test')
  on conflict (id) do nothing;

  insert into public.campus (id, school_id, name, is_default)
  values (v_campus_a, v_school_a, 'Main Campus', true)
  on conflict (id) do nothing;

  insert into public.school_branding (school_id, display_name, logo_url, brand_color_hex)
  values (v_school_a, 'Seed School A', null, '#1D4ED8')
  on conflict (school_id) do nothing;

  insert into public.school_module_flag (school_id, module_key, enabled)
  values (v_school_a, 'attendance', true)
  on conflict (school_id, module_key) do nothing;

  insert into public.school_member (id, auth_user_id, school_id, campus_id)
  values (v_member_a, v_user_a, v_school_a, v_campus_a)
  on conflict (id) do nothing;

  insert into public.school_member_role (school_member_id, role_id)
  select v_member_a, r.id from public.role r where r.key = 'school_owner'
  on conflict do nothing;

  -- P1 numbering-concurrency test fixture (packages/db/tests/numbering-concurrency.test.ts) --
  -- reuses this same seeded school rather than needing its own. Rows can only be created via
  -- migration/seed (no client INSERT grant on school_number_sequence), hence living here.
  insert into public.school_number_sequence (school_id, sequence_key, prefix, padding, next_value)
  values
    (v_school_a, 'student_admission', 'HRC-', 4, 1),
    (v_school_a, 'staff_employee_code', 'EMP-', 3, 1)
  on conflict (school_id, sequence_key) do nothing;

  -- ---------------------------------------------------------------------
  -- School B -- exists so the isolation test has something School A must NOT see.
  -- ---------------------------------------------------------------------
  insert into public.school (id, legal_name, board, address, contact_phone, contact_email)
  values (v_school_b, 'Seed School B', 'CBSE', 'Varanasi, UP', '+919415000020', 'contact@seed-b.test')
  on conflict (id) do nothing;

  insert into public.campus (id, school_id, name, is_default)
  values (v_campus_b, v_school_b, 'Main Campus', true)
  on conflict (id) do nothing;

  insert into public.school_branding (school_id, display_name, logo_url, brand_color_hex)
  values (v_school_b, 'Seed School B', null, '#B91C1C')
  on conflict (school_id) do nothing;

  insert into public.school_module_flag (school_id, module_key, enabled)
  values (v_school_b, 'attendance', false)
  on conflict (school_id, module_key) do nothing;

  insert into public.school_member (id, auth_user_id, school_id, campus_id)
  values (v_member_b, v_user_b, v_school_b, v_campus_b)
  on conflict (id) do nothing;

  insert into public.school_member_role (school_member_id, role_id)
  select v_member_b, r.id from public.role r where r.key = 'school_owner'
  on conflict do nothing;

end $$;
