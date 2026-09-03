-- Fix found by the volume test (packages/db/tests/import-volume.test.ts): committing ~2,000
-- students hit Postgres's statement timeout and was killed partway through. Two causes,
-- both fixed:
--
-- 1. fn_commit_student_import_rows called fn_next_school_number -- one row-locked
--    SELECT+UPDATE -- once per row needing an auto-generated admission number. At 2,000 rows
--    that's 2,000 separate lock acquisitions in sequence. fn_reserve_school_numbers below
--    reserves a whole BLOCK of numbers in ONE lock acquisition; the commit loop then assigns
--    them by simple arithmetic, no lock per row. fn_next_school_number itself is untouched and
--    still used for one-off interactive creates (a single student added via the UI).
--
-- 2. Even after that fix, committing 2,000 rows (student + enrollment + up to 2 guardian
--    lookups/inserts each) is legitimately heavier than a typical API request. Rather than
--    pretend a bulk admin operation should complete in the same time budget as a normal CRUD
--    call, both validate and commit now raise their OWN statement_timeout for just that call
--    (SET LOCAL -- scoped to this transaction only, not a global change to every
--    `authenticated` query). 120s is generous headroom, not a target; the volume test measures
--    the actual number.
create or replace function public.fn_reserve_school_numbers(p_school_id uuid, p_sequence_key text, p_count int)
returns table (start_value int, prefix text, padding int)
language plpgsql
as $$
declare
  v_start int;
  v_prefix text;
  v_padding int;
begin
  if p_count <= 0 then
    return;
  end if;

  select next_value, school_number_sequence.prefix, school_number_sequence.padding
    into v_start, v_prefix, v_padding
    from public.school_number_sequence
    where school_id = p_school_id and sequence_key = p_sequence_key
    for update;

  if not found then
    raise exception 'No number sequence configured for school % / %', p_school_id, p_sequence_key;
  end if;

  update public.school_number_sequence
    set next_value = v_start + p_count
    where school_id = p_school_id and sequence_key = p_sequence_key;

  return query select v_start, v_prefix, v_padding;
end;
$$;

grant execute on function public.fn_reserve_school_numbers(uuid, text, int) to authenticated;

create or replace function public.fn_commit_student_import_rows(p_batch_id uuid, p_school_id uuid, p_actor_auth_user_id uuid)
returns void
language plpgsql
as $$
declare
  v_academic_year_id uuid;
  v_row record;
  v_student_id uuid;
  v_admission_number text;
  i int;
  v_prefix text;
  v_g_name text;
  v_g_phone text;
  v_g_relationship text;
  v_g_email text;
  v_guardian_id uuid;
  v_is_primary boolean;
  v_needed int;
  v_reserved_start int;
  v_reserved_prefix text;
  v_reserved_padding int;
  v_offset int := 0;
begin
  perform set_config('statement_timeout', '120000', true);

  select id into v_academic_year_id from public.academic_year where school_id = p_school_id and is_current;
  if v_academic_year_id is null then
    raise exception 'School % has no current academic_year set -- cannot assign enrollments', p_school_id;
  end if;

  -- Reserve a whole block of admission numbers in ONE lock acquisition, not one per row.
  select count(*) into v_needed
  from public.import_row
  where batch_id = p_batch_id and validation_status = 'valid' and action = 'create'
    and coalesce(trim(mapped_data->>'admission_number'), '') = '';

  if v_needed > 0 then
    select start_value, prefix, padding into v_reserved_start, v_reserved_prefix, v_reserved_padding
    from public.fn_reserve_school_numbers(p_school_id, 'student_admission', v_needed);
  end if;

  for v_row in
    select * from public.import_row where batch_id = p_batch_id and validation_status = 'valid' order by row_number
  loop
    if v_row.action = 'create' then
      v_admission_number := nullif(trim(v_row.mapped_data->>'admission_number'), '');
      if v_admission_number is null then
        v_admission_number := v_reserved_prefix || lpad((v_reserved_start + v_offset)::text, v_reserved_padding, '0');
        v_offset := v_offset + 1;
      end if;

      insert into public.student (
        school_id, admission_number, first_name, last_name, dob, gender, blood_group,
        category_id, house_id, previous_school_name, created_by_import_batch_id
      ) values (
        p_school_id,
        v_admission_number,
        v_row.mapped_data->>'first_name',
        v_row.mapped_data->>'last_name',
        nullif(v_row.mapped_data->>'dob', '')::date,
        nullif(v_row.mapped_data->>'gender', ''),
        nullif(v_row.mapped_data->>'blood_group', ''),
        nullif(v_row.mapped_data->>'_category_id', '')::uuid,
        nullif(v_row.mapped_data->>'_house_id', '')::uuid,
        nullif(v_row.mapped_data->>'previous_school_name', ''),
        p_batch_id
      ) returning id into v_student_id;

      insert into public.enrollment (school_id, student_id, academic_year_id, class_id, section_id, roll_number)
      values (
        p_school_id, v_student_id, v_academic_year_id,
        (v_row.mapped_data->>'_class_id')::uuid,
        (v_row.mapped_data->>'_section_id')::uuid,
        nullif(v_row.mapped_data->>'roll_number', '')
      );

    elsif v_row.action = 'update' then
      v_student_id := (v_row.mapped_data->>'_existing_student_id')::uuid;

      update public.import_row
      set previous_data = to_jsonb(s.*)
      from public.student s
      where import_row.id = v_row.id and s.id = v_student_id;

      update public.student s
      set first_name = v_row.mapped_data->>'first_name',
          last_name = v_row.mapped_data->>'last_name',
          dob = coalesce(nullif(v_row.mapped_data->>'dob', '')::date, s.dob),
          gender = coalesce(nullif(v_row.mapped_data->>'gender', ''), s.gender),
          blood_group = coalesce(nullif(v_row.mapped_data->>'blood_group', ''), s.blood_group),
          category_id = coalesce(nullif(v_row.mapped_data->>'_category_id', '')::uuid, s.category_id),
          house_id = coalesce(nullif(v_row.mapped_data->>'_house_id', '')::uuid, s.house_id)
      where s.id = v_student_id;

      insert into public.enrollment (school_id, student_id, academic_year_id, class_id, section_id, roll_number)
      values (
        p_school_id, v_student_id, v_academic_year_id,
        (v_row.mapped_data->>'_class_id')::uuid,
        (v_row.mapped_data->>'_section_id')::uuid,
        nullif(v_row.mapped_data->>'roll_number', '')
      )
      on conflict (school_id, student_id, academic_year_id)
      do update set class_id = excluded.class_id, section_id = excluded.section_id, roll_number = excluded.roll_number;
    end if;

    for i in 1..2 loop
      v_prefix := 'guardian' || i || '_';
      v_g_name := nullif(trim(v_row.mapped_data->>(v_prefix || 'name')), '');
      v_g_phone := nullif(trim(v_row.mapped_data->>(v_prefix || 'phone')), '');
      v_g_relationship := nullif(trim(v_row.mapped_data->>(v_prefix || 'relationship')), '');
      v_g_email := nullif(trim(v_row.mapped_data->>(v_prefix || 'email')), '');
      v_is_primary := (i = 1);

      if v_g_name is not null then
        select sg.guardian_id into v_guardian_id
        from public.student_guardian sg
        where sg.student_id = v_student_id and sg.is_primary_contact = v_is_primary;

        if v_guardian_id is null then
          insert into public.guardian (school_id, first_name, created_by_import_batch_id)
          values (p_school_id, v_g_name, p_batch_id)
          returning id into v_guardian_id;

          insert into public.student_guardian (student_id, guardian_id, school_id, relationship_type, phone, email, is_primary_contact)
          values (v_student_id, v_guardian_id, p_school_id, coalesce(v_g_relationship, 'guardian'), v_g_phone, v_g_email, v_is_primary);
        else
          update public.guardian set first_name = v_g_name where id = v_guardian_id;
          update public.student_guardian
          set relationship_type = coalesce(v_g_relationship, relationship_type),
              phone = coalesce(v_g_phone, phone),
              email = coalesce(v_g_email, email)
          where student_id = v_student_id and guardian_id = v_guardian_id;
        end if;
      end if;
    end loop;

    update public.import_row set entity_id = v_student_id where id = v_row.id;
  end loop;

  insert into public.audit_log (school_id, actor_auth_user_id, action, entity_type, entity_id, metadata)
  values (p_school_id, p_actor_auth_user_id, 'import_batch.committed', 'import_batch', p_batch_id,
    jsonb_build_object('entity_type', 'student'));
end;
$$;

create or replace function public.fn_commit_staff_import_rows(p_batch_id uuid, p_school_id uuid, p_actor_auth_user_id uuid)
returns void
language plpgsql
as $$
declare
  v_row record;
  v_staff_id uuid;
  v_employee_code text;
  v_needed int;
  v_reserved_start int;
  v_reserved_prefix text;
  v_reserved_padding int;
  v_offset int := 0;
begin
  perform set_config('statement_timeout', '120000', true);

  select count(*) into v_needed
  from public.import_row
  where batch_id = p_batch_id and validation_status = 'valid' and action = 'create'
    and coalesce(trim(mapped_data->>'employee_code'), '') = '';

  if v_needed > 0 then
    select start_value, prefix, padding into v_reserved_start, v_reserved_prefix, v_reserved_padding
    from public.fn_reserve_school_numbers(p_school_id, 'staff_employee_code', v_needed);
  end if;

  for v_row in
    select * from public.import_row where batch_id = p_batch_id and validation_status = 'valid' order by row_number
  loop
    if v_row.action = 'create' then
      v_employee_code := nullif(trim(v_row.mapped_data->>'employee_code'), '');
      if v_employee_code is null then
        v_employee_code := v_reserved_prefix || lpad((v_reserved_start + v_offset)::text, v_reserved_padding, '0');
        v_offset := v_offset + 1;
      end if;

      insert into public.staff (
        school_id, employee_code, first_name, last_name, dob, gender, phone, email,
        department_id, designation_id, joining_date, created_by_import_batch_id
      ) values (
        p_school_id,
        v_employee_code,
        v_row.mapped_data->>'first_name',
        v_row.mapped_data->>'last_name',
        nullif(v_row.mapped_data->>'dob', '')::date,
        nullif(v_row.mapped_data->>'gender', ''),
        nullif(v_row.mapped_data->>'phone', ''),
        nullif(v_row.mapped_data->>'email', ''),
        nullif(v_row.mapped_data->>'_department_id', '')::uuid,
        nullif(v_row.mapped_data->>'_designation_id', '')::uuid,
        (v_row.mapped_data->>'joining_date')::date,
        p_batch_id
      ) returning id into v_staff_id;

    elsif v_row.action = 'update' then
      v_staff_id := (v_row.mapped_data->>'_existing_staff_id')::uuid;

      update public.import_row
      set previous_data = to_jsonb(st.*)
      from public.staff st
      where import_row.id = v_row.id and st.id = v_staff_id;

      update public.staff st
      set first_name = v_row.mapped_data->>'first_name',
          last_name = v_row.mapped_data->>'last_name',
          dob = coalesce(nullif(v_row.mapped_data->>'dob', '')::date, st.dob),
          gender = coalesce(nullif(v_row.mapped_data->>'gender', ''), st.gender),
          phone = coalesce(nullif(v_row.mapped_data->>'phone', ''), st.phone),
          email = coalesce(nullif(v_row.mapped_data->>'email', ''), st.email),
          department_id = coalesce(nullif(v_row.mapped_data->>'_department_id', '')::uuid, st.department_id),
          designation_id = coalesce(nullif(v_row.mapped_data->>'_designation_id', '')::uuid, st.designation_id)
      where st.id = v_staff_id;
    end if;

    update public.import_row set entity_id = v_staff_id where id = v_row.id;
  end loop;

  insert into public.audit_log (school_id, actor_auth_user_id, action, entity_type, entity_id, metadata)
  values (p_school_id, p_actor_auth_user_id, 'import_batch.committed', 'import_batch', p_batch_id,
    jsonb_build_object('entity_type', 'staff'));
end;
$$;

create or replace function public.fn_validate_student_import_rows(p_batch_id uuid, p_school_id uuid, p_match_mode text)
returns void
language plpgsql
as $$
begin
  perform set_config('statement_timeout', '60000', true);

  update public.import_row
  set validation_status = 'rejected', rejection_reason = 'Missing required field (first_name, last_name, class_name, or section_name)'
  where batch_id = p_batch_id and validation_status = 'pending'
    and (
      coalesce(trim(mapped_data->>'first_name'), '') = ''
      or coalesce(trim(mapped_data->>'last_name'), '') = ''
      or coalesce(trim(mapped_data->>'class_name'), '') = ''
      or coalesce(trim(mapped_data->>'section_name'), '') = ''
    );

  update public.import_row
  set mapped_data = jsonb_set(mapped_data, '{gender}', to_jsonb(lower(trim(mapped_data->>'gender'))))
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'gender'), '') <> '';

  update public.import_row
  set validation_status = 'rejected', rejection_reason = 'Invalid gender (expected male, female, or other)'
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'gender'), '') <> ''
    and mapped_data->>'gender' not in ('male', 'female', 'other');

  update public.import_row
  set validation_status = 'rejected', rejection_reason = 'Invalid dob format (expected YYYY-MM-DD)'
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'dob'), '') <> ''
    and trim(mapped_data->>'dob') !~ '^\d{4}-\d{2}-\d{2}$';

  update public.import_row
  set mapped_data = jsonb_set(mapped_data, '{guardian1_relationship}', to_jsonb(lower(trim(mapped_data->>'guardian1_relationship'))))
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'guardian1_relationship'), '') <> '';
  update public.import_row
  set mapped_data = jsonb_set(mapped_data, '{guardian2_relationship}', to_jsonb(lower(trim(mapped_data->>'guardian2_relationship'))))
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'guardian2_relationship'), '') <> '';

  update public.import_row
  set validation_status = 'rejected', rejection_reason = 'Invalid guardian1_relationship (expected father, mother, guardian, or other)'
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'guardian1_relationship'), '') <> ''
    and mapped_data->>'guardian1_relationship' not in ('father', 'mother', 'guardian', 'other');

  update public.import_row
  set validation_status = 'rejected', rejection_reason = 'Invalid guardian2_relationship (expected father, mother, guardian, or other)'
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'guardian2_relationship'), '') <> ''
    and mapped_data->>'guardian2_relationship' not in ('father', 'mother', 'guardian', 'other');

  if p_match_mode = 'admission_number' then
    update public.import_row
    set validation_status = 'rejected', rejection_reason = 'Missing admission_number (required for this import''s match mode)'
    where batch_id = p_batch_id and validation_status = 'pending'
      and coalesce(trim(mapped_data->>'admission_number'), '') = '';

    with dupes as (
      select trim(mapped_data->>'admission_number') as adm
      from public.import_row
      where batch_id = p_batch_id and validation_status = 'pending'
      group by 1
      having count(*) > 1
    )
    update public.import_row ir
    set validation_status = 'rejected', rejection_reason = 'Duplicate admission_number within this file'
    where ir.batch_id = p_batch_id and ir.validation_status = 'pending'
      and trim(ir.mapped_data->>'admission_number') in (select adm from dupes);

    update public.import_row ir
    set action = 'update',
        mapped_data = ir.mapped_data || jsonb_build_object('_existing_student_id', s.id)
    from public.student s
    where ir.batch_id = p_batch_id and ir.validation_status = 'pending'
      and s.school_id = p_school_id
      and s.admission_number = trim(ir.mapped_data->>'admission_number');

    update public.import_row
    set action = 'create'
    where batch_id = p_batch_id and validation_status = 'pending' and action is null;
  else
    update public.import_row
    set action = 'create'
    where batch_id = p_batch_id and validation_status = 'pending';

    with dupes as (
      select trim(mapped_data->>'admission_number') as adm
      from public.import_row
      where batch_id = p_batch_id and validation_status = 'pending'
        and coalesce(trim(mapped_data->>'admission_number'), '') <> ''
      group by 1
      having count(*) > 1
    )
    update public.import_row ir
    set validation_status = 'rejected', rejection_reason = 'Duplicate admission_number within this file'
    where ir.batch_id = p_batch_id and ir.validation_status = 'pending'
      and trim(ir.mapped_data->>'admission_number') in (select adm from dupes);

    update public.import_row ir
    set validation_status = 'rejected', rejection_reason = 'admission_number already exists for this school'
    from public.student s
    where ir.batch_id = p_batch_id and ir.validation_status = 'pending'
      and coalesce(trim(ir.mapped_data->>'admission_number'), '') <> ''
      and s.school_id = p_school_id
      and s.admission_number = trim(ir.mapped_data->>'admission_number');
  end if;

  update public.import_row ir
  set mapped_data = ir.mapped_data || jsonb_build_object('_class_id', c.id, '_section_id', sec.id)
  from public.class c
  join public.section sec on sec.class_id = c.id
  where ir.batch_id = p_batch_id and ir.validation_status = 'pending'
    and c.school_id = p_school_id
    and lower(trim(c.name)) = lower(trim(ir.mapped_data->>'class_name'))
    and lower(trim(sec.name)) = lower(trim(ir.mapped_data->>'section_name'));

  update public.import_row
  set validation_status = 'rejected', rejection_reason = 'Unknown class/section for this school'
  where batch_id = p_batch_id and validation_status = 'pending' and not (mapped_data ? '_class_id');

  update public.import_row ir
  set mapped_data = ir.mapped_data || jsonb_build_object('_category_id', cat.id)
  from public.student_category cat
  where ir.batch_id = p_batch_id and ir.validation_status = 'pending'
    and coalesce(trim(ir.mapped_data->>'category_key'), '') <> ''
    and cat.school_id = p_school_id
    and lower(trim(cat.key)) = lower(trim(ir.mapped_data->>'category_key'));

  update public.import_row
  set validation_status = 'rejected', rejection_reason = 'Unknown category_key for this school'
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'category_key'), '') <> ''
    and not (mapped_data ? '_category_id');

  update public.import_row ir
  set mapped_data = ir.mapped_data || jsonb_build_object('_house_id', h.id)
  from public.house h
  where ir.batch_id = p_batch_id and ir.validation_status = 'pending'
    and coalesce(trim(ir.mapped_data->>'house_name'), '') <> ''
    and h.school_id = p_school_id
    and lower(trim(h.name)) = lower(trim(ir.mapped_data->>'house_name'));

  update public.import_row
  set validation_status = 'rejected', rejection_reason = 'Unknown house_name for this school'
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'house_name'), '') <> ''
    and not (mapped_data ? '_house_id');

  update public.import_row
  set validation_status = 'valid'
  where batch_id = p_batch_id and validation_status = 'pending';

  update public.import_row
  set action = null
  where batch_id = p_batch_id and validation_status = 'rejected';
end;
$$;

create or replace function public.fn_validate_staff_import_rows(p_batch_id uuid, p_school_id uuid, p_match_mode text)
returns void
language plpgsql
as $$
begin
  perform set_config('statement_timeout', '60000', true);

  update public.import_row
  set validation_status = 'rejected', rejection_reason = 'Missing required field (first_name, last_name, or joining_date)'
  where batch_id = p_batch_id and validation_status = 'pending'
    and (
      coalesce(trim(mapped_data->>'first_name'), '') = ''
      or coalesce(trim(mapped_data->>'last_name'), '') = ''
      or coalesce(trim(mapped_data->>'joining_date'), '') = ''
    );

  update public.import_row
  set validation_status = 'rejected', rejection_reason = 'Invalid joining_date format (expected YYYY-MM-DD)'
  where batch_id = p_batch_id and validation_status = 'pending'
    and trim(mapped_data->>'joining_date') !~ '^\d{4}-\d{2}-\d{2}$';

  update public.import_row
  set mapped_data = jsonb_set(mapped_data, '{gender}', to_jsonb(lower(trim(mapped_data->>'gender'))))
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'gender'), '') <> '';

  update public.import_row
  set validation_status = 'rejected', rejection_reason = 'Invalid gender (expected male, female, or other)'
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'gender'), '') <> ''
    and mapped_data->>'gender' not in ('male', 'female', 'other');

  update public.import_row
  set validation_status = 'rejected', rejection_reason = 'Invalid dob format (expected YYYY-MM-DD)'
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'dob'), '') <> ''
    and trim(mapped_data->>'dob') !~ '^\d{4}-\d{2}-\d{2}$';

  if p_match_mode = 'employee_code' then
    update public.import_row
    set validation_status = 'rejected', rejection_reason = 'Missing employee_code (required for this import''s match mode)'
    where batch_id = p_batch_id and validation_status = 'pending'
      and coalesce(trim(mapped_data->>'employee_code'), '') = '';

    with dupes as (
      select trim(mapped_data->>'employee_code') as code
      from public.import_row
      where batch_id = p_batch_id and validation_status = 'pending'
      group by 1
      having count(*) > 1
    )
    update public.import_row ir
    set validation_status = 'rejected', rejection_reason = 'Duplicate employee_code within this file'
    where ir.batch_id = p_batch_id and ir.validation_status = 'pending'
      and trim(ir.mapped_data->>'employee_code') in (select code from dupes);

    update public.import_row ir
    set action = 'update',
        mapped_data = ir.mapped_data || jsonb_build_object('_existing_staff_id', st.id)
    from public.staff st
    where ir.batch_id = p_batch_id and ir.validation_status = 'pending'
      and st.school_id = p_school_id
      and st.employee_code = trim(ir.mapped_data->>'employee_code');

    update public.import_row
    set action = 'create'
    where batch_id = p_batch_id and validation_status = 'pending' and action is null;
  else
    update public.import_row
    set action = 'create'
    where batch_id = p_batch_id and validation_status = 'pending';

    with dupes as (
      select trim(mapped_data->>'employee_code') as code
      from public.import_row
      where batch_id = p_batch_id and validation_status = 'pending'
        and coalesce(trim(mapped_data->>'employee_code'), '') <> ''
      group by 1
      having count(*) > 1
    )
    update public.import_row ir
    set validation_status = 'rejected', rejection_reason = 'Duplicate employee_code within this file'
    where ir.batch_id = p_batch_id and ir.validation_status = 'pending'
      and trim(ir.mapped_data->>'employee_code') in (select code from dupes);

    update public.import_row ir
    set validation_status = 'rejected', rejection_reason = 'employee_code already exists for this school'
    from public.staff st
    where ir.batch_id = p_batch_id and ir.validation_status = 'pending'
      and coalesce(trim(ir.mapped_data->>'employee_code'), '') <> ''
      and st.school_id = p_school_id
      and st.employee_code = trim(ir.mapped_data->>'employee_code');
  end if;

  update public.import_row ir
  set mapped_data = ir.mapped_data || jsonb_build_object('_department_id', d.id)
  from public.department d
  where ir.batch_id = p_batch_id and ir.validation_status = 'pending'
    and coalesce(trim(ir.mapped_data->>'department_name'), '') <> ''
    and d.school_id = p_school_id
    and lower(trim(d.name)) = lower(trim(ir.mapped_data->>'department_name'));

  update public.import_row
  set validation_status = 'rejected', rejection_reason = 'Unknown department_name for this school'
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'department_name'), '') <> ''
    and not (mapped_data ? '_department_id');

  update public.import_row ir
  set mapped_data = ir.mapped_data || jsonb_build_object('_designation_id', des.id)
  from public.designation des
  where ir.batch_id = p_batch_id and ir.validation_status = 'pending'
    and coalesce(trim(ir.mapped_data->>'designation_name'), '') <> ''
    and des.school_id = p_school_id
    and lower(trim(des.name)) = lower(trim(ir.mapped_data->>'designation_name'));

  update public.import_row
  set validation_status = 'rejected', rejection_reason = 'Unknown designation_name for this school'
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'designation_name'), '') <> ''
    and not (mapped_data ? '_designation_id');

  update public.import_row
  set validation_status = 'valid'
  where batch_id = p_batch_id and validation_status = 'pending';

  update public.import_row
  set action = null
  where batch_id = p_batch_id and validation_status = 'rejected';
end;
$$;
