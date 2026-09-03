-- P1 Students & Staff, part 9: import validation.
--
-- Bulk, set-based SQL throughout -- this runs on batches up to ~2,000 rows, and a per-row round
-- trip from application code at that size is exactly the kind of thing that times out during a
-- live onboarding session with the school watching (see the volume test). Every UPDATE here
-- touches every still-pending row in one statement, not one row at a time.
--
-- SECURITY INVOKER (the default) throughout -- these functions write to import_row/import_batch
-- as the calling user, so the RLS policies on those tables (school.manage_students /
-- school.manage_staff, same-school) are the real authorization boundary, not a check inside the
-- function.
create or replace function public.fn_validate_student_import_rows(p_batch_id uuid, p_school_id uuid, p_match_mode text)
returns void
language plpgsql
as $$
begin
  -- Required fields.
  update public.import_row
  set validation_status = 'rejected', rejection_reason = 'Missing required field (first_name, last_name, class_name, or section_name)'
  where batch_id = p_batch_id and validation_status = 'pending'
    and (
      coalesce(trim(mapped_data->>'first_name'), '') = ''
      or coalesce(trim(mapped_data->>'last_name'), '') = ''
      or coalesce(trim(mapped_data->>'class_name'), '') = ''
      or coalesce(trim(mapped_data->>'section_name'), '') = ''
    );

  if p_match_mode = 'admission_number' then
    -- Missing match key.
    update public.import_row
    set validation_status = 'rejected', rejection_reason = 'Missing admission_number (required for this import''s match mode)'
    where batch_id = p_batch_id and validation_status = 'pending'
      and coalesce(trim(mapped_data->>'admission_number'), '') = '';

    -- Duplicate match key within the file -- reject every row sharing the value, not just the
    -- second occurrence, since there's no way to tell which one is authoritative.
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

    -- Match against existing students -> action = update; augment mapped_data with the
    -- existing row's id for the commit function to use.
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
    -- match_mode = 'none': always create. If admission_number was supplied anyway, it must not
    -- collide within the file or with an existing student (fn_next_school_number only covers
    -- the auto-generated case, not an explicit value the school typed in).
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

  -- Resolve class/section by name (case-insensitive, trimmed). Unresolved rows reject --
  -- master data is controlled, an import never creates a class/section on the fly.
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

  -- Optional lookups: student_category, house. Blank is fine (nullable); a non-blank value that
  -- doesn't resolve rejects, same "controlled master data" reasoning as class/section.
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

  -- Everything still pending after all the above cleared every check.
  update public.import_row
  set validation_status = 'valid'
  where batch_id = p_batch_id and validation_status = 'pending';
end;
$$;

create or replace function public.fn_validate_staff_import_rows(p_batch_id uuid, p_school_id uuid, p_match_mode text)
returns void
language plpgsql
as $$
begin
  update public.import_row
  set validation_status = 'rejected', rejection_reason = 'Missing required field (first_name, last_name, or joining_date)'
  where batch_id = p_batch_id and validation_status = 'pending'
    and (
      coalesce(trim(mapped_data->>'first_name'), '') = ''
      or coalesce(trim(mapped_data->>'last_name'), '') = ''
      or coalesce(trim(mapped_data->>'joining_date'), '') = ''
    );

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

  -- Optional lookups: department, designation. Same "blank is fine, unresolved non-blank
  -- rejects" reasoning as student's category/house.
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
end;
$$;

create or replace function public.fn_validate_import_batch(p_batch_id uuid)
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
  if v_batch.status <> 'staged' then
    raise exception 'Batch % is not staged (currently %)', p_batch_id, v_batch.status;
  end if;

  update public.import_row
  set validation_status = 'pending', rejection_reason = null, action = null
  where batch_id = p_batch_id;

  if v_batch.entity_type = 'student' then
    perform public.fn_validate_student_import_rows(p_batch_id, v_batch.school_id, v_batch.match_mode);
  else
    perform public.fn_validate_staff_import_rows(p_batch_id, v_batch.school_id, v_batch.match_mode);
  end if;

  update public.import_batch
  set status = 'validated',
      total_rows = (select count(*) from public.import_row where batch_id = p_batch_id),
      created_count = (select count(*) from public.import_row where batch_id = p_batch_id and action = 'create'),
      updated_count = (select count(*) from public.import_row where batch_id = p_batch_id and action = 'update'),
      rejected_count = (select count(*) from public.import_row where batch_id = p_batch_id and validation_status = 'rejected')
  where id = p_batch_id;
end;
$$;

grant execute on function public.fn_validate_student_import_rows(uuid, uuid, text) to authenticated;
grant execute on function public.fn_validate_staff_import_rows(uuid, uuid, text) to authenticated;
grant execute on function public.fn_validate_import_batch(uuid) to authenticated;
