-- Closes a gap found while writing the commit function: an unvalidated gender, dob, or
-- guardian relationship_type value would hit a CHECK constraint violation partway through
-- fn_commit_student_import_rows's per-row loop, which runs as one transaction -- meaning a
-- single bad value on row 1,500 would roll back everything committed before it in that same
-- call. Rejecting these at validation time (before commit ever runs) means a bad value shows up
-- as one rejected row in the preview, not a failed commit of the whole batch.
create or replace function public.fn_validate_student_import_rows(p_batch_id uuid, p_school_id uuid, p_match_mode text)
returns void
language plpgsql
as $$
begin
  update public.import_row
  set validation_status = 'rejected', rejection_reason = 'Missing required field (first_name, last_name, class_name, or section_name)'
  where batch_id = p_batch_id and validation_status = 'pending'
    and (
      coalesce(trim(mapped_data->>'first_name'), '') = ''
      or coalesce(trim(mapped_data->>'last_name'), '') = ''
      or coalesce(trim(mapped_data->>'class_name'), '') = ''
      or coalesce(trim(mapped_data->>'section_name'), '') = ''
    );

  -- gender: optional, but if present must resolve to the student table's check constraint.
  update public.import_row
  set mapped_data = jsonb_set(mapped_data, '{gender}', to_jsonb(lower(trim(mapped_data->>'gender'))))
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'gender'), '') <> '';

  update public.import_row
  set validation_status = 'rejected', rejection_reason = 'Invalid gender (expected male, female, or other)'
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'gender'), '') <> ''
    and mapped_data->>'gender' not in ('male', 'female', 'other');

  -- dob: optional, but if present must be an unambiguous ISO date.
  update public.import_row
  set validation_status = 'rejected', rejection_reason = 'Invalid dob format (expected YYYY-MM-DD)'
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'dob'), '') <> ''
    and trim(mapped_data->>'dob') !~ '^\d{4}-\d{2}-\d{2}$';

  -- guardian1/2 relationship: optional (defaults to 'guardian' at commit if a name is given but
  -- relationship is blank), but if present must resolve to the check constraint.
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
