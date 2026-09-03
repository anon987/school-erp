-- Fix found by testing the re-import scenario the whole matching design exists for: matching a
-- guardian by (student_id, phone) fails exactly when a re-imported file corrects a WRONG phone
-- number for an existing guardian -- the phone is the thing that changed, so it can't also be
-- the match key. Re-importing a corrected file created a second guardian record instead of
-- updating the first.
--
-- Fixed to match by guardian SLOT instead: guardian1_* always refers to the same semantic slot
-- for a given student across re-imports (is_primary_contact = true), guardian2_* the other
-- (is_primary_contact = false) -- regardless of what value in that slot changed. This is not
-- perfect (a school that swaps which slot the father vs mother go in between imports would get
-- an existing guardian record silently relabeled rather than a new one created), but that's a
-- much rarer failure than "every phone-number correction creates a duplicate guardian," which
-- is the case this fixes.
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

    -- Guardians: matched by SLOT (guardian1 = is_primary_contact true, guardian2 = false), not
    -- by phone -- see this migration's header for why.
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
          insert into public.guardian (school_id, first_name)
          values (p_school_id, v_g_name)
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
