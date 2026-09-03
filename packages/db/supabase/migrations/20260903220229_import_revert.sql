-- P1 Students & Staff, part 11: import revert.
--
-- Registry correction found while writing this function: document rows were seeded as
-- blocks_revert = false ("created together, cascade"), but the import commit function never
-- touches the document table at all -- a document is ALWAYS uploaded by a separate, later user
-- action. That makes it operational work, exactly like a class-teacher appointment, not part of
-- the same unit. Fixed to block rather than silently delete a photo/ID-proof someone uploaded
-- after the import ran.
update public.import_revert_dependent_registry
set blocks_revert = true,
    note = 'No automatic cascade (polymorphic column); a document is always uploaded via a separate action AFTER the import commits, so treat as operational work -- block revert rather than silently delete it.'
where dependent_table = 'document';

-- Guardians need their own batch attribution (like student/staff already have) so revert can
-- tell "a guardian this batch created" from "a pre-existing guardian this batch merely reused."
-- Only set on actual creation, never on reuse -- see the commit function below.
alter table public.guardian add column created_by_import_batch_id uuid references public.import_batch(id) on delete set null;

-- Re-point the commit function to stamp it.
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

-- ---------------------------------------------------------------------------
-- fn_revert_import_batch
--
-- SECURITY INVOKER (the default -- no keyword needed, stated here for emphasis): runs as the
-- calling user, so every read and write in this function is still subject to RLS. The explicit
-- school_id check below is defense-in-depth on top of that, not a substitute for it -- it turns
-- "the batch silently wasn't visible" into a clear, intentional error. See
-- packages/db/tests/import-revert-cross-school.test.ts for the proof: a school A user calling
-- this with a school B batch id must fail, not revert school B's data.
--
-- All-or-nothing: the check pass (read-only) runs to completion and collects every blocking
-- reason before anything is touched. If anything blocks, NOTHING is reverted and the full list
-- comes back for the caller to act on. This is a safety net for "wrong file imported, caught
-- within hours" -- not an undo button for weeks of subsequent operational work; see the 7-day
-- window check.
-- ---------------------------------------------------------------------------
create or replace function public.fn_revert_import_batch(p_batch_id uuid, p_actor_auth_user_id uuid)
returns jsonb
language plpgsql
as $$
declare
  v_batch public.import_batch;
  v_row record;
  v_blockers jsonb := '[]'::jsonb;
  v_dep record;
  v_exists boolean;
  v_check_sql text;
  v_guardian record;
  v_external_link_count int;
begin
  select * into v_batch from public.import_batch where id = p_batch_id;
  if not found then
    raise exception 'Import batch % not found or not visible to the caller', p_batch_id;
  end if;

  if v_batch.school_id <> public.current_school_id() and not public.is_super_admin() then
    raise exception 'Batch % does not belong to the caller''s school', p_batch_id;
  end if;

  if v_batch.status <> 'committed' then
    raise exception 'Batch % is not committed (currently %) -- nothing to revert', p_batch_id, v_batch.status;
  end if;

  if now() - v_batch.committed_at > interval '7 days' then
    raise exception 'Batch % was committed more than 7 days ago -- the revert window has closed', p_batch_id;
  end if;

  -- ---- Check pass (read-only): collect every blocker before touching anything ----
  for v_row in select * from public.import_row where batch_id = p_batch_id and validation_status = 'valid' loop
    if v_row.entity_id is null then
      continue;
    end if;

    if v_row.action = 'create' then
      if v_batch.entity_type = 'student' then
        select (updated_at <> created_at) into v_exists from public.student where id = v_row.entity_id;
      else
        select (updated_at <> created_at) into v_exists from public.staff where id = v_row.entity_id;
      end if;
      if coalesce(v_exists, false) then
        v_blockers := v_blockers || jsonb_build_object('row_number', v_row.row_number, 'reason', 'modified since import');
      end if;
    elsif v_row.action = 'update' then
      if v_batch.entity_type = 'student' then
        select (updated_at > v_batch.committed_at) into v_exists from public.student where id = v_row.entity_id;
      else
        select (updated_at > v_batch.committed_at) into v_exists from public.staff where id = v_row.entity_id;
      end if;
      if coalesce(v_exists, false) then
        v_blockers := v_blockers || jsonb_build_object('row_number', v_row.row_number, 'reason', 'modified since import');
      end if;
    end if;

    -- Registry-driven blocking dependents with a real, non-polymorphic FK -- generic dynamic
    -- SQL is safe here because fk_column genuinely names a single column on a single table.
    for v_dep in
      select * from public.import_revert_dependent_registry
      where entity_table = v_batch.entity_type and blocks_revert = true
        and special_cased = false and dependent_table <> 'document'
    loop
      v_check_sql := format('select exists(select 1 from %I where %I = $1)', v_dep.dependent_table, v_dep.fk_column);
      execute v_check_sql into v_exists using v_row.entity_id;
      if v_exists then
        v_blockers := v_blockers || jsonb_build_object(
          'row_number', v_row.row_number, 'reason', format('has %s row(s)', v_dep.dependent_table)
        );
      end if;
    end loop;

    -- document: polymorphic (owner_type/owner_id), special-cased inline -- see the registry
    -- update at the top of this migration.
    select exists(
      select 1 from public.document where owner_type = v_batch.entity_type and owner_id = v_row.entity_id
    ) into v_exists;
    if v_exists then
      v_blockers := v_blockers || jsonb_build_object('row_number', v_row.row_number, 'reason', 'has document(s) uploaded after import');
    end if;
  end loop;

  -- Guardian special case (student batches only) -- batch-relative, not a simple existence
  -- check: a guardian's OWN creation link is itself a student_guardian row, so plain existence
  -- would always block. Only an external link (to a student outside this batch) blocks.
  if v_batch.entity_type = 'student' then
    for v_guardian in select id from public.guardian where created_by_import_batch_id = p_batch_id loop
      select count(*) into v_external_link_count
      from public.student_guardian sg
      join public.student s on s.id = sg.student_id
      where sg.guardian_id = v_guardian.id
        and s.created_by_import_batch_id is distinct from p_batch_id;

      if v_external_link_count > 0 then
        v_blockers := v_blockers || jsonb_build_object(
          'guardian_id', v_guardian.id, 'reason', 'guardian is linked to a student outside this batch'
        );
      end if;
    end loop;
  end if;

  if jsonb_array_length(v_blockers) > 0 then
    return jsonb_build_object('reverted', false, 'blockers', v_blockers);
  end if;

  -- ---- Act pass: every check cleared, revert every valid row. ----
  for v_row in select * from public.import_row where batch_id = p_batch_id and validation_status = 'valid' loop
    if v_row.entity_id is null then
      continue;
    end if;

    if v_row.action = 'create' then
      if v_batch.entity_type = 'student' then
        delete from public.student where id = v_row.entity_id; -- cascades enrollment, student_guardian
      else
        delete from public.staff where id = v_row.entity_id; -- cascades staff_qualification
      end if;
    elsif v_row.action = 'update' and v_row.previous_data is not null then
      if v_batch.entity_type = 'student' then
        update public.student set
          admission_number = v_row.previous_data->>'admission_number',
          first_name = v_row.previous_data->>'first_name',
          last_name = v_row.previous_data->>'last_name',
          dob = nullif(v_row.previous_data->>'dob', '')::date,
          gender = v_row.previous_data->>'gender',
          blood_group = v_row.previous_data->>'blood_group',
          category_id = nullif(v_row.previous_data->>'category_id', '')::uuid,
          house_id = nullif(v_row.previous_data->>'house_id', '')::uuid,
          previous_school_name = v_row.previous_data->>'previous_school_name',
          status = v_row.previous_data->>'status'
        where id = v_row.entity_id;
      else
        update public.staff set
          employee_code = v_row.previous_data->>'employee_code',
          first_name = v_row.previous_data->>'first_name',
          last_name = v_row.previous_data->>'last_name',
          dob = nullif(v_row.previous_data->>'dob', '')::date,
          gender = v_row.previous_data->>'gender',
          phone = v_row.previous_data->>'phone',
          email = v_row.previous_data->>'email',
          department_id = nullif(v_row.previous_data->>'department_id', '')::uuid,
          designation_id = nullif(v_row.previous_data->>'designation_id', '')::uuid,
          joining_date = nullif(v_row.previous_data->>'joining_date', '')::date,
          employment_status = v_row.previous_data->>'employment_status'
        where id = v_row.entity_id;
      end if;
    end if;
  end loop;

  if v_batch.entity_type = 'student' then
    delete from public.guardian where created_by_import_batch_id = p_batch_id; -- cascades student_guardian
  end if;

  update public.import_batch
  set status = 'reverted', reverted_at = now(), reverted_by_auth_user_id = p_actor_auth_user_id
  where id = p_batch_id;

  insert into public.audit_log (school_id, actor_auth_user_id, action, entity_type, entity_id, metadata)
  values (v_batch.school_id, p_actor_auth_user_id, 'import_batch.reverted', 'import_batch', p_batch_id, '{}'::jsonb);

  return jsonb_build_object('reverted', true, 'blockers', '[]'::jsonb);
end;
$$;

grant execute on function public.fn_revert_import_batch(uuid, uuid) to authenticated;
