-- P1 Students & Staff, part 10: import commit.
--
-- One function call, one transaction, one loop over already-validated rows -- not one HTTP
-- round trip per row from application code. A loop inside a single PL/pgSQL invocation is what
-- makes committing ~2,000 rows a matter of seconds rather than a client-side loop of ~2,000
-- separate network requests (the volume test in packages/db/tests/import-volume.test.ts proves
-- this holds; see that file for actual numbers). admission_number generation is the one
-- genuinely sequential part (fn_next_school_number's row lock), which is why it can't be a
-- single bulk INSERT ... SELECT for rows needing an auto-generated number.
--
-- Guardian matching is scoped to "does this SAME student already have a guardian at this phone
-- number" -- not a cross-student/cross-family dedup. A phone number shared by siblings imported
-- in the same file creates one guardian row per student. This is a deliberate, documented
-- simplification, not an oversight -- true sibling-sharing would need cross-row matching within
-- the batch and against all pre-existing data, which is a meaningfully larger problem than "did
-- re-importing the same file create duplicates."
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
begin
  select id into v_academic_year_id from public.academic_year where school_id = p_school_id and is_current;
  if v_academic_year_id is null then
    raise exception 'School % has no current academic_year set -- cannot assign enrollments', p_school_id;
  end if;

  for v_row in
    select * from public.import_row where batch_id = p_batch_id and validation_status = 'valid' order by row_number
  loop
    if v_row.action = 'create' then
      v_admission_number := nullif(trim(v_row.mapped_data->>'admission_number'), '');
      if v_admission_number is null then
        v_admission_number := public.fn_next_school_number(p_school_id, 'student_admission');
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

      -- Snapshot BEFORE mutating -- this is what fn_revert_import_batch restores.
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

    -- Guardians: up to 2 slots embedded in the row.
    for i in 1..2 loop
      v_prefix := 'guardian' || i || '_';
      v_g_name := nullif(trim(v_row.mapped_data->>(v_prefix || 'name')), '');
      v_g_phone := nullif(trim(v_row.mapped_data->>(v_prefix || 'phone')), '');
      v_g_relationship := nullif(trim(v_row.mapped_data->>(v_prefix || 'relationship')), '');
      v_g_email := nullif(trim(v_row.mapped_data->>(v_prefix || 'email')), '');

      if v_g_name is not null then
        select g.id into v_guardian_id
        from public.guardian g
        join public.student_guardian sg on sg.guardian_id = g.id
        where sg.student_id = v_student_id and sg.phone is not distinct from v_g_phone;

        if v_guardian_id is null then
          insert into public.guardian (school_id, first_name)
          values (p_school_id, v_g_name)
          returning id into v_guardian_id;

          insert into public.student_guardian (student_id, guardian_id, school_id, relationship_type, phone, email, is_primary_contact)
          values (v_student_id, v_guardian_id, p_school_id, coalesce(v_g_relationship, 'guardian'), v_g_phone, v_g_email, i = 1);
        else
          update public.guardian set first_name = v_g_name where id = v_guardian_id;
          update public.student_guardian
          set relationship_type = coalesce(v_g_relationship, relationship_type), email = coalesce(v_g_email, email)
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
begin
  for v_row in
    select * from public.import_row where batch_id = p_batch_id and validation_status = 'valid' order by row_number
  loop
    if v_row.action = 'create' then
      v_employee_code := nullif(trim(v_row.mapped_data->>'employee_code'), '');
      if v_employee_code is null then
        v_employee_code := public.fn_next_school_number(p_school_id, 'staff_employee_code');
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

create or replace function public.fn_commit_import_batch(p_batch_id uuid, p_actor_auth_user_id uuid)
returns void
language plpgsql
as $$
declare
  v_batch public.import_batch;
begin
  select * into v_batch from public.import_batch where id = p_batch_id;
  if not found then
    raise exception 'Import batch % not found', p_batch_id;
  end if;
  if v_batch.status <> 'validated' then
    raise exception 'Batch % is not validated (currently %)', p_batch_id, v_batch.status;
  end if;
  if v_batch.is_dry_run then
    raise exception 'Batch % is a dry run and cannot be committed', p_batch_id;
  end if;

  if v_batch.entity_type = 'student' then
    perform public.fn_commit_student_import_rows(p_batch_id, v_batch.school_id, p_actor_auth_user_id);
  else
    perform public.fn_commit_staff_import_rows(p_batch_id, v_batch.school_id, p_actor_auth_user_id);
  end if;

  update public.import_batch
  set status = 'committed', committed_at = now()
  where id = p_batch_id;
end;
$$;

grant execute on function public.fn_commit_student_import_rows(uuid, uuid, uuid) to authenticated;
grant execute on function public.fn_commit_staff_import_rows(uuid, uuid, uuid) to authenticated;
grant execute on function public.fn_commit_import_batch(uuid, uuid) to authenticated;
