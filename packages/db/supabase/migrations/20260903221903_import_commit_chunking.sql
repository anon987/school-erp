-- Real fix for the timeout found by the volume test. `SET LOCAL statement_timeout` inside the
-- function (previous migration) did NOT help -- confirmed empirically: it timed out again at
-- the same point via the authenticated role. Postgres arms statement_timeout for a top-level
-- statement using the GUC value in effect when that statement STARTS; a function called partway
-- through that same statement changing the GUC does not retroactively reschedule the
-- already-armed interrupt. Committing via a service connection (no meaningful timeout) took
-- ~7s for 2,000 rows -- confirming the WORK itself is fine, the constraint is a fixed per-request
-- ceiling on the API role.
--
-- The correct fix is NOT a global `ALTER ROLE authenticated SET statement_timeout`. That would
-- let any runaway or buggy query from any endpoint, for any school, hold a pooled connection for
-- the same extended window -- a multi-tenant availability risk, not a targeted one. Instead,
-- commit is now chunked: fn_commit_import_batch processes up to p_limit not-yet-committed rows
-- per call and reports how many remain. The caller (a client-side loop, same idea already used
-- for staging in chunks of 500) calls it repeatedly until done. This is still bulk, set-oriented
-- work per call -- a few hundred rows in one transaction, not one row per round trip -- just
-- sized to fit the per-request ceiling instead of fighting it.
alter table public.import_batch drop constraint import_batch_status_check;
alter table public.import_batch add constraint import_batch_status_check
  check (status in ('staged', 'validated', 'committing', 'committed', 'reverted'));

-- `CREATE OR REPLACE FUNCTION` matches on the parameter type list -- changing the number of
-- parameters creates a NEW overload rather than replacing the old one, which would leave both
-- the old 3-arg commit-row functions and old 2-arg fn_commit_import_batch around, ambiguous
-- against the new signatures below for any call using named JSON parameters (how PostgREST
-- calls RPCs). Drop the old signatures explicitly first.
drop function if exists public.fn_commit_student_import_rows(uuid, uuid, uuid);
drop function if exists public.fn_commit_staff_import_rows(uuid, uuid, uuid);
drop function if exists public.fn_commit_import_batch(uuid, uuid);

create or replace function public.fn_commit_student_import_rows(p_batch_id uuid, p_school_id uuid, p_actor_auth_user_id uuid, p_limit int)
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
  select id into v_academic_year_id from public.academic_year where school_id = p_school_id and is_current;
  if v_academic_year_id is null then
    raise exception 'School % has no current academic_year set -- cannot assign enrollments', p_school_id;
  end if;

  -- Only this call's chunk -- rows already processed by an earlier call have entity_id set.
  create temporary table _commit_chunk on commit drop as
  select * from public.import_row
  where batch_id = p_batch_id and validation_status = 'valid' and entity_id is null
  order by row_number
  limit p_limit;

  select count(*) into v_needed
  from _commit_chunk
  where action = 'create' and coalesce(trim(mapped_data->>'admission_number'), '') = '';

  if v_needed > 0 then
    select start_value, prefix, padding into v_reserved_start, v_reserved_prefix, v_reserved_padding
    from public.fn_reserve_school_numbers(p_school_id, 'student_admission', v_needed);
  end if;

  for v_row in select * from _commit_chunk order by row_number loop
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
end;
$$;

create or replace function public.fn_commit_staff_import_rows(p_batch_id uuid, p_school_id uuid, p_actor_auth_user_id uuid, p_limit int)
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
  create temporary table _commit_chunk on commit drop as
  select * from public.import_row
  where batch_id = p_batch_id and validation_status = 'valid' and entity_id is null
  order by row_number
  limit p_limit;

  select count(*) into v_needed
  from _commit_chunk
  where action = 'create' and coalesce(trim(mapped_data->>'employee_code'), '') = '';

  if v_needed > 0 then
    select start_value, prefix, padding into v_reserved_start, v_reserved_prefix, v_reserved_padding
    from public.fn_reserve_school_numbers(p_school_id, 'staff_employee_code', v_needed);
  end if;

  for v_row in select * from _commit_chunk order by row_number loop
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
end;
$$;

-- fn_commit_import_batch is now chunked and idempotent-per-call: it commits up to p_limit
-- not-yet-committed rows and reports how many remain. It transitions status staged (no --
-- validated) -> committing -> committed only once every valid row has an entity_id. The
-- audit_log write and committed_at timestamp happen exactly once, on the call that finishes
-- the last remaining row -- not once per chunk.
create or replace function public.fn_commit_import_batch(p_batch_id uuid, p_actor_auth_user_id uuid, p_limit int default 300)
returns jsonb
language plpgsql
as $$
declare
  v_batch public.import_batch;
  v_remaining int;
begin
  select * into v_batch from public.import_batch where id = p_batch_id;
  if not found then
    raise exception 'Import batch % not found', p_batch_id;
  end if;
  if v_batch.status not in ('validated', 'committing') then
    raise exception 'Batch % is not validated (currently %)', p_batch_id, v_batch.status;
  end if;
  if v_batch.is_dry_run then
    raise exception 'Batch % is a dry run and cannot be committed', p_batch_id;
  end if;

  if v_batch.status = 'validated' then
    update public.import_batch set status = 'committing' where id = p_batch_id;
  end if;

  if v_batch.entity_type = 'student' then
    perform public.fn_commit_student_import_rows(p_batch_id, v_batch.school_id, p_actor_auth_user_id, p_limit);
  else
    perform public.fn_commit_staff_import_rows(p_batch_id, v_batch.school_id, p_actor_auth_user_id, p_limit);
  end if;

  select count(*) into v_remaining
  from public.import_row
  where batch_id = p_batch_id and validation_status = 'valid' and entity_id is null;

  if v_remaining = 0 then
    update public.import_batch set status = 'committed', committed_at = now() where id = p_batch_id;

    insert into public.audit_log (school_id, actor_auth_user_id, action, entity_type, entity_id, metadata)
    values (v_batch.school_id, p_actor_auth_user_id, 'import_batch.committed', 'import_batch', p_batch_id,
      jsonb_build_object('entity_type', v_batch.entity_type));
  end if;

  return jsonb_build_object('remaining', v_remaining, 'done', v_remaining = 0);
end;
$$;

grant execute on function public.fn_commit_student_import_rows(uuid, uuid, uuid, int) to authenticated;
grant execute on function public.fn_commit_staff_import_rows(uuid, uuid, uuid, int) to authenticated;
