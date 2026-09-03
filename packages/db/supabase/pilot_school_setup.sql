-- One-time setup for the real pilot school, Shri Hansraj Career Inter College (Rampur,
-- Jaunpur) -- separate from seed.sql's two-school RLS fixture, which stays untouched (the
-- isolation test suite depends on it). Run manually, not part of `supabase db reset`:
--
--   supabase db query --linked --file supabase/pilot_school_setup.sql
--
-- This creates the school, an owner login, and master data (academic year, classes 6-12 with 6
-- sections each, departments, designations, houses, categories, number sequences). Students and
-- staff are populated separately, through the real import pipeline (see
-- packages/db/tests/import-volume.test.ts) -- not seeded directly here -- because that's both
-- the realistic dataset AND the volume proof the pipeline needed anyway.
do $$
declare
  v_school_id uuid := '33333333-3333-3333-3333-333333333333';
  v_campus_id uuid := '33333333-3333-3333-3333-333333333334';
  v_owner_id uuid := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  v_academic_year_id uuid;
  v_class_id uuid;
  v_class_name text;
  v_section_name text;
  v_password text := 'Seed-Test-Passw0rd!';
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_owner_id, 'authenticated', 'authenticated',
    'owner@hansraj.schoolerp.test', extensions.crypt(v_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
  ) on conflict (id) do nothing;

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (
    gen_random_uuid(), v_owner_id, v_owner_id::text,
    jsonb_build_object('sub', v_owner_id::text, 'email', 'owner@hansraj.schoolerp.test'),
    'email', now(), now(), now()
  ) on conflict (provider_id, provider) do nothing;

  insert into public.user_profile (auth_user_id, phone, display_name, email)
  values (v_owner_id, '+919415099001', 'Shri Hansraj Owner', 'owner@hansraj.schoolerp.test')
  on conflict (auth_user_id) do nothing;

  insert into public.school (id, legal_name, board, address, contact_phone, contact_email)
  values (v_school_id, 'Shri Hansraj Career Inter College', 'UP Board', 'Rampur, Jaunpur, UP', '+919415099000', 'contact@hansraj.schoolerp.test')
  on conflict (id) do nothing;

  insert into public.campus (id, school_id, name, is_default)
  values (v_campus_id, v_school_id, 'Main Campus', true)
  on conflict (id) do nothing;

  insert into public.school_branding (school_id, display_name, logo_url, brand_color_hex)
  values (v_school_id, 'Shri Hansraj Career Inter College', null, '#1D4ED8')
  on conflict (school_id) do nothing;

  insert into public.school_member (id, auth_user_id, school_id, campus_id)
  values ('dddddddd-0000-0000-0000-000000000001', v_owner_id, v_school_id, v_campus_id)
  on conflict (id) do nothing;

  insert into public.school_member_role (school_member_id, role_id)
  select 'dddddddd-0000-0000-0000-000000000001', r.id from public.role r where r.key = 'school_owner'
  on conflict do nothing;

  insert into public.school_number_sequence (school_id, sequence_key, prefix, padding, next_value)
  values
    (v_school_id, 'student_admission', 'SHC-', 5, 1),
    (v_school_id, 'staff_employee_code', 'EMP-', 4, 1)
  on conflict (school_id, sequence_key) do nothing;

  insert into public.academic_year (school_id, name, start_date, end_date, is_current)
  values (v_school_id, '2026-27', '2026-04-01', '2027-03-31', true)
  on conflict (school_id, name) do nothing
  returning id into v_academic_year_id;

  if v_academic_year_id is null then
    select id into v_academic_year_id from public.academic_year where school_id = v_school_id and name = '2026-27';
  end if;

  foreach v_class_name in array array['6', '7', '8', '9', '10', '11', '12'] loop
    insert into public.class (school_id, name, sort_order)
    values (v_school_id, v_class_name, v_class_name::int)
    on conflict (school_id, name) do nothing;

    select id into v_class_id from public.class where school_id = v_school_id and name = v_class_name;

    foreach v_section_name in array array['A', 'B', 'C', 'D', 'E', 'F'] loop
      insert into public.section (school_id, class_id, name)
      values (v_school_id, v_class_id, v_section_name)
      on conflict (class_id, name) do nothing;
    end loop;
  end loop;

  insert into public.subject (school_id, name, code) values
    (v_school_id, 'Hindi', 'HIN'), (v_school_id, 'English', 'ENG'), (v_school_id, 'Mathematics', 'MATH'),
    (v_school_id, 'Science', 'SCI'), (v_school_id, 'Social Science', 'SOC'), (v_school_id, 'Sanskrit', 'SAN')
  on conflict (school_id, name) do nothing;

  insert into public.department (school_id, name) values
    (v_school_id, 'Science'), (v_school_id, 'Mathematics'), (v_school_id, 'Languages'),
    (v_school_id, 'Social Science'), (v_school_id, 'Administration'), (v_school_id, 'Physical Education')
  on conflict (school_id, name) do nothing;

  insert into public.designation (school_id, name) values
    (v_school_id, 'Principal'), (v_school_id, 'Vice Principal'), (v_school_id, 'PGT'),
    (v_school_id, 'TGT'), (v_school_id, 'PRT'), (v_school_id, 'Clerk'), (v_school_id, 'Peon')
  on conflict (school_id, name) do nothing;

  insert into public.house (school_id, name) values
    (v_school_id, 'Ashoka'), (v_school_id, 'Gandhi'), (v_school_id, 'Nehru'), (v_school_id, 'Tagore')
  on conflict (school_id, name) do nothing;

  insert into public.student_category (school_id, key, label) values
    (v_school_id, 'general', 'General'), (v_school_id, 'obc', 'OBC'),
    (v_school_id, 'sc', 'SC'), (v_school_id, 'st', 'ST'), (v_school_id, 'ews', 'EWS')
  on conflict (school_id, key) do nothing;
end $$;
