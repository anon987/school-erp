-- Import fix-and-reupload loop -- one ticket (docs/schoolerp_launchplan.md weeks 4-5, flagged as
-- a pilot-onboarding blocker that must not slip): column mapping, value-specific rejection
-- errors, and an uncapped rejected-rows CSV export. This migration covers the first two; the CSV
-- export needs no schema change (it's a new Route Handler reading existing columns).
--
-- Column mapping: uploadImportAction used to stage rows with mapped_data = raw_data verbatim --
-- the uploaded file's own column headers became the field keys the validate/commit functions
-- read, so a real school file (headers like "Student Name" or "DOB") failed every row against
-- fields named first_name/last_name/dob. Fixed by splitting staging into two steps: stage with
-- mapped_data = '{}'::jsonb (a real, not-yet-mapped state, not a transient one), the app shows a
-- mapping UI, then fn_apply_import_column_mapping rewrites mapped_data from raw_data using the
-- confirmed column -> field mapping. Chunked for the same reason commit/validate are: a
-- single UPDATE over 2,000+ rows risks the same statement-timeout wall those did.
alter table public.import_batch add column raw_headers text[];

create or replace function public.fn_apply_import_column_mapping(p_batch_id uuid, p_mapping jsonb, p_limit int default 500)
returns jsonb
language plpgsql
as $$
declare
  v_remaining int;
begin
  with chunk as (
    select id from public.import_row
    where batch_id = p_batch_id and mapped_data = '{}'::jsonb
    order by row_number
    limit p_limit
  )
  update public.import_row ir
  set mapped_data = coalesce(
    (
      select jsonb_object_agg(target_key, coalesce(ir.raw_data ->> (p_mapping ->> target_key), ''))
      from jsonb_object_keys(p_mapping) as target_key
      where coalesce(p_mapping ->> target_key, '') <> ''
    ),
    '{}'::jsonb
  )
  from chunk
  where ir.id = chunk.id;

  select count(*) into v_remaining from public.import_row where batch_id = p_batch_id and mapped_data = '{}'::jsonb;
  return jsonb_build_object('remaining', v_remaining, 'done', v_remaining = 0);
end;
$$;

grant execute on function public.fn_apply_import_column_mapping(uuid, jsonb, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Value-specific rejection messages -- every "Invalid X" / "Unknown X" / "Duplicate X" reason
-- now names the actual value found in the row, not just the category of problem. A school fixing
-- 200 rejected rows in Excel needs to know THIS row had "Grade 6-A" and the school only has a
-- class named "6" -- "Unknown class/section for this school" alone means re-opening every row to
-- find out which one. Same signatures as the chunked versions (import_validate_chunking
-- migration) -- create or replace, no drop needed.
-- ---------------------------------------------------------------------------

create or replace function public.fn_validate_student_phase1(p_batch_id uuid, p_match_mode text)
returns void
language plpgsql
as $$
begin
  update public.import_row
  set validation_status = 'rejected', rejection_reason = 'Missing required field: first_name'
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'first_name'), '') = '';
  update public.import_row
  set validation_status = 'rejected', rejection_reason = 'Missing required field: last_name'
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'last_name'), '') = '';
  update public.import_row
  set validation_status = 'rejected', rejection_reason = 'Missing required field: class_name'
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'class_name'), '') = '';
  update public.import_row
  set validation_status = 'rejected', rejection_reason = 'Missing required field: section_name'
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'section_name'), '') = '';

  update public.import_row
  set mapped_data = jsonb_set(mapped_data, '{gender}', to_jsonb(lower(trim(mapped_data->>'gender'))))
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'gender'), '') <> '';
  update public.import_row
  set validation_status = 'rejected',
      rejection_reason = 'Invalid gender: "' || (mapped_data->>'gender') || '" (expected male, female, or other)'
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'gender'), '') <> '' and mapped_data->>'gender' not in ('male', 'female', 'other');

  update public.import_row
  set validation_status = 'rejected',
      rejection_reason = 'Invalid dob: "' || (mapped_data->>'dob') || '" (expected YYYY-MM-DD)'
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'dob'), '') <> '' and trim(mapped_data->>'dob') !~ '^\d{4}-\d{2}-\d{2}$';

  update public.import_row
  set mapped_data = jsonb_set(mapped_data, '{guardian1_relationship}', to_jsonb(lower(trim(mapped_data->>'guardian1_relationship'))))
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'guardian1_relationship'), '') <> '';
  update public.import_row
  set mapped_data = jsonb_set(mapped_data, '{guardian2_relationship}', to_jsonb(lower(trim(mapped_data->>'guardian2_relationship'))))
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'guardian2_relationship'), '') <> '';
  update public.import_row
  set validation_status = 'rejected',
      rejection_reason = 'Invalid guardian1_relationship: "' || (mapped_data->>'guardian1_relationship') || '" (expected father, mother, guardian, or other)'
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'guardian1_relationship'), '') <> ''
    and mapped_data->>'guardian1_relationship' not in ('father', 'mother', 'guardian', 'other');
  update public.import_row
  set validation_status = 'rejected',
      rejection_reason = 'Invalid guardian2_relationship: "' || (mapped_data->>'guardian2_relationship') || '" (expected father, mother, guardian, or other)'
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'guardian2_relationship'), '') <> ''
    and mapped_data->>'guardian2_relationship' not in ('father', 'mother', 'guardian', 'other');

  if p_match_mode = 'admission_number' then
    update public.import_row
    set validation_status = 'rejected', rejection_reason = 'Missing admission_number (required for this import''s match mode)'
    where batch_id = p_batch_id and validation_status = 'pending' and coalesce(trim(mapped_data->>'admission_number'), '') = '';

    with dupes as (
      select trim(mapped_data->>'admission_number') as adm from public.import_row
      where batch_id = p_batch_id and validation_status = 'pending'
      group by 1 having count(*) > 1
    )
    update public.import_row ir
    set validation_status = 'rejected',
        rejection_reason = 'Duplicate admission_number within this file: "' || trim(ir.mapped_data->>'admission_number') || '"'
    where ir.batch_id = p_batch_id and ir.validation_status = 'pending'
      and trim(ir.mapped_data->>'admission_number') in (select adm from dupes);
  else
    with dupes as (
      select trim(mapped_data->>'admission_number') as adm from public.import_row
      where batch_id = p_batch_id and validation_status = 'pending'
        and coalesce(trim(mapped_data->>'admission_number'), '') <> ''
      group by 1 having count(*) > 1
    )
    update public.import_row ir
    set validation_status = 'rejected',
        rejection_reason = 'Duplicate admission_number within this file: "' || trim(ir.mapped_data->>'admission_number') || '"'
    where ir.batch_id = p_batch_id and ir.validation_status = 'pending'
      and trim(ir.mapped_data->>'admission_number') in (select adm from dupes);
  end if;
end;
$$;

create or replace function public.fn_validate_student_phase2(p_batch_id uuid, p_school_id uuid, p_match_mode text, p_limit int)
returns void
language plpgsql
as $$
begin
  create temporary table _validate_chunk on commit drop as
  select id from public.import_row
  where batch_id = p_batch_id and validation_status = 'pending'
  order by row_number
  limit p_limit;

  if p_match_mode = 'admission_number' then
    update public.import_row ir
    set action = 'update', mapped_data = ir.mapped_data || jsonb_build_object('_existing_student_id', s.id)
    from public.student s
    where ir.id in (select id from _validate_chunk)
      and s.school_id = p_school_id and s.admission_number = trim(ir.mapped_data->>'admission_number');

    update public.import_row
    set action = 'create'
    where id in (select id from _validate_chunk) and action is null;
  else
    update public.import_row
    set action = 'create'
    where id in (select id from _validate_chunk);

    update public.import_row ir
    set validation_status = 'rejected',
        rejection_reason = 'admission_number already exists for this school: "' || trim(ir.mapped_data->>'admission_number') || '"'
    from public.student s
    where ir.id in (select id from _validate_chunk)
      and coalesce(trim(ir.mapped_data->>'admission_number'), '') <> ''
      and s.school_id = p_school_id and s.admission_number = trim(ir.mapped_data->>'admission_number');
  end if;

  update public.import_row ir
  set mapped_data = ir.mapped_data || jsonb_build_object('_class_id', c.id, '_section_id', sec.id)
  from public.class c
  join public.section sec on sec.class_id = c.id
  where ir.id in (select id from _validate_chunk) and ir.validation_status = 'pending'
    and c.school_id = p_school_id
    and lower(trim(c.name)) = lower(trim(ir.mapped_data->>'class_name'))
    and lower(trim(sec.name)) = lower(trim(ir.mapped_data->>'section_name'));

  update public.import_row
  set validation_status = 'rejected',
      rejection_reason = 'Unknown class/section for this school: "' || (mapped_data->>'class_name') || '" / "' || (mapped_data->>'section_name') || '"',
      action = null
  where id in (select id from _validate_chunk) and validation_status = 'pending' and not (mapped_data ? '_class_id');

  update public.import_row ir
  set mapped_data = ir.mapped_data || jsonb_build_object('_category_id', cat.id)
  from public.student_category cat
  where ir.id in (select id from _validate_chunk) and ir.validation_status = 'pending'
    and coalesce(trim(ir.mapped_data->>'category_key'), '') <> ''
    and cat.school_id = p_school_id and lower(trim(cat.key)) = lower(trim(ir.mapped_data->>'category_key'));
  update public.import_row
  set validation_status = 'rejected',
      rejection_reason = 'Unknown category_key for this school: "' || (mapped_data->>'category_key') || '"',
      action = null
  where id in (select id from _validate_chunk) and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'category_key'), '') <> '' and not (mapped_data ? '_category_id');

  update public.import_row ir
  set mapped_data = ir.mapped_data || jsonb_build_object('_house_id', h.id)
  from public.house h
  where ir.id in (select id from _validate_chunk) and ir.validation_status = 'pending'
    and coalesce(trim(ir.mapped_data->>'house_name'), '') <> ''
    and h.school_id = p_school_id and lower(trim(h.name)) = lower(trim(ir.mapped_data->>'house_name'));
  update public.import_row
  set validation_status = 'rejected',
      rejection_reason = 'Unknown house_name for this school: "' || (mapped_data->>'house_name') || '"',
      action = null
  where id in (select id from _validate_chunk) and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'house_name'), '') <> '' and not (mapped_data ? '_house_id');

  update public.import_row
  set validation_status = 'valid'
  where id in (select id from _validate_chunk) and validation_status = 'pending';
end;
$$;

create or replace function public.fn_validate_staff_phase1(p_batch_id uuid, p_match_mode text)
returns void
language plpgsql
as $$
begin
  update public.import_row
  set validation_status = 'rejected', rejection_reason = 'Missing required field: first_name'
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'first_name'), '') = '';
  update public.import_row
  set validation_status = 'rejected', rejection_reason = 'Missing required field: last_name'
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'last_name'), '') = '';
  update public.import_row
  set validation_status = 'rejected', rejection_reason = 'Missing required field: joining_date'
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'joining_date'), '') = '';

  update public.import_row
  set validation_status = 'rejected',
      rejection_reason = 'Invalid joining_date: "' || (mapped_data->>'joining_date') || '" (expected YYYY-MM-DD)'
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'joining_date'), '') <> '' and trim(mapped_data->>'joining_date') !~ '^\d{4}-\d{2}-\d{2}$';

  update public.import_row
  set mapped_data = jsonb_set(mapped_data, '{gender}', to_jsonb(lower(trim(mapped_data->>'gender'))))
  where batch_id = p_batch_id and validation_status = 'pending' and coalesce(trim(mapped_data->>'gender'), '') <> '';
  update public.import_row
  set validation_status = 'rejected',
      rejection_reason = 'Invalid gender: "' || (mapped_data->>'gender') || '" (expected male, female, or other)'
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'gender'), '') <> '' and mapped_data->>'gender' not in ('male', 'female', 'other');

  update public.import_row
  set validation_status = 'rejected',
      rejection_reason = 'Invalid dob: "' || (mapped_data->>'dob') || '" (expected YYYY-MM-DD)'
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'dob'), '') <> '' and trim(mapped_data->>'dob') !~ '^\d{4}-\d{2}-\d{2}$';

  if p_match_mode = 'employee_code' then
    update public.import_row
    set validation_status = 'rejected', rejection_reason = 'Missing employee_code (required for this import''s match mode)'
    where batch_id = p_batch_id and validation_status = 'pending' and coalesce(trim(mapped_data->>'employee_code'), '') = '';

    with dupes as (
      select trim(mapped_data->>'employee_code') as code from public.import_row
      where batch_id = p_batch_id and validation_status = 'pending'
      group by 1 having count(*) > 1
    )
    update public.import_row ir
    set validation_status = 'rejected',
        rejection_reason = 'Duplicate employee_code within this file: "' || trim(ir.mapped_data->>'employee_code') || '"'
    where ir.batch_id = p_batch_id and ir.validation_status = 'pending'
      and trim(ir.mapped_data->>'employee_code') in (select code from dupes);
  else
    with dupes as (
      select trim(mapped_data->>'employee_code') as code from public.import_row
      where batch_id = p_batch_id and validation_status = 'pending'
        and coalesce(trim(mapped_data->>'employee_code'), '') <> ''
      group by 1 having count(*) > 1
    )
    update public.import_row ir
    set validation_status = 'rejected',
        rejection_reason = 'Duplicate employee_code within this file: "' || trim(ir.mapped_data->>'employee_code') || '"'
    where ir.batch_id = p_batch_id and ir.validation_status = 'pending'
      and trim(ir.mapped_data->>'employee_code') in (select code from dupes);
  end if;
end;
$$;

create or replace function public.fn_validate_staff_phase2(p_batch_id uuid, p_school_id uuid, p_match_mode text, p_limit int)
returns void
language plpgsql
as $$
begin
  create temporary table _validate_chunk on commit drop as
  select id from public.import_row
  where batch_id = p_batch_id and validation_status = 'pending'
  order by row_number
  limit p_limit;

  if p_match_mode = 'employee_code' then
    update public.import_row ir
    set action = 'update', mapped_data = ir.mapped_data || jsonb_build_object('_existing_staff_id', st.id)
    from public.staff st
    where ir.id in (select id from _validate_chunk)
      and st.school_id = p_school_id and st.employee_code = trim(ir.mapped_data->>'employee_code');

    update public.import_row
    set action = 'create'
    where id in (select id from _validate_chunk) and action is null;
  else
    update public.import_row
    set action = 'create'
    where id in (select id from _validate_chunk);

    update public.import_row ir
    set validation_status = 'rejected',
        rejection_reason = 'employee_code already exists for this school: "' || trim(ir.mapped_data->>'employee_code') || '"'
    from public.staff st
    where ir.id in (select id from _validate_chunk)
      and coalesce(trim(ir.mapped_data->>'employee_code'), '') <> ''
      and st.school_id = p_school_id and st.employee_code = trim(ir.mapped_data->>'employee_code');
  end if;

  update public.import_row ir
  set mapped_data = ir.mapped_data || jsonb_build_object('_department_id', d.id)
  from public.department d
  where ir.id in (select id from _validate_chunk) and ir.validation_status = 'pending'
    and coalesce(trim(ir.mapped_data->>'department_name'), '') <> ''
    and d.school_id = p_school_id and lower(trim(d.name)) = lower(trim(ir.mapped_data->>'department_name'));
  update public.import_row
  set validation_status = 'rejected',
      rejection_reason = 'Unknown department_name for this school: "' || (mapped_data->>'department_name') || '"',
      action = null
  where id in (select id from _validate_chunk) and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'department_name'), '') <> '' and not (mapped_data ? '_department_id');

  update public.import_row ir
  set mapped_data = ir.mapped_data || jsonb_build_object('_designation_id', des.id)
  from public.designation des
  where ir.id in (select id from _validate_chunk) and ir.validation_status = 'pending'
    and coalesce(trim(ir.mapped_data->>'designation_name'), '') <> ''
    and des.school_id = p_school_id and lower(trim(des.name)) = lower(trim(ir.mapped_data->>'designation_name'));
  update public.import_row
  set validation_status = 'rejected',
      rejection_reason = 'Unknown designation_name for this school: "' || (mapped_data->>'designation_name') || '"',
      action = null
  where id in (select id from _validate_chunk) and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'designation_name'), '') <> '' and not (mapped_data ? '_designation_id');

  update public.import_row
  set validation_status = 'valid'
  where id in (select id from _validate_chunk) and validation_status = 'pending';
end;
$$;
