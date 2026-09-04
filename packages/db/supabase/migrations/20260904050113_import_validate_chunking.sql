-- Real finding from re-running the full test suite: fn_validate_import_batch itself can hit
-- the same statement-timeout wall commit did -- it happened to have enough margin to pass most
-- runs at 2,000 rows, then didn't. Same root cause, same fix: chunk it. The wrinkle here (that
-- commit didn't have) is that duplicate-admission-number detection genuinely needs to see the
-- WHOLE file at once -- chunking that naively would let two duplicate rows land in different
-- chunk calls and get treated asymmetrically (one valid, one rejected), which breaks the
-- explicit "reject every row sharing the value, not just the second occurrence" rule from the
-- original design.
--
-- Fixed with two phases:
--  Phase 1 (once, unchunked): required-field/format checks and file-wide duplicate/match-key
--  detection -- cheap, join-free, indexed by batch_id; safe to run over the whole batch in one
--  shot because there's nothing here that scales with a join against another table.
--  Phase 2 (chunked, p_limit rows per call): the actual expensive part -- resolving class/
--  section/category/house/existing-student by lookup -- which IS safe to chunk because each
--  row's resolution is independent of every other row's.
alter table public.import_batch drop constraint import_batch_status_check;
alter table public.import_batch add constraint import_batch_status_check
  check (status in ('staged', 'validating', 'validated', 'committing', 'committed', 'reverted'));

drop function if exists public.fn_validate_student_import_rows(uuid, uuid, text);
drop function if exists public.fn_validate_staff_import_rows(uuid, uuid, text);
drop function if exists public.fn_validate_import_batch(uuid);

create or replace function public.fn_validate_student_phase1(p_batch_id uuid, p_match_mode text)
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

  update public.import_row
  set mapped_data = jsonb_set(mapped_data, '{gender}', to_jsonb(lower(trim(mapped_data->>'gender'))))
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'gender'), '') <> '';
  update public.import_row
  set validation_status = 'rejected', rejection_reason = 'Invalid gender (expected male, female, or other)'
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'gender'), '') <> '' and mapped_data->>'gender' not in ('male', 'female', 'other');

  update public.import_row
  set validation_status = 'rejected', rejection_reason = 'Invalid dob format (expected YYYY-MM-DD)'
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
    where batch_id = p_batch_id and validation_status = 'pending' and coalesce(trim(mapped_data->>'admission_number'), '') = '';

    with dupes as (
      select trim(mapped_data->>'admission_number') as adm from public.import_row
      where batch_id = p_batch_id and validation_status = 'pending'
      group by 1 having count(*) > 1
    )
    update public.import_row ir
    set validation_status = 'rejected', rejection_reason = 'Duplicate admission_number within this file'
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
    set validation_status = 'rejected', rejection_reason = 'Duplicate admission_number within this file'
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
    set validation_status = 'rejected', rejection_reason = 'admission_number already exists for this school'
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
  set validation_status = 'rejected', rejection_reason = 'Unknown class/section for this school', action = null
  where id in (select id from _validate_chunk) and validation_status = 'pending' and not (mapped_data ? '_class_id');

  update public.import_row ir
  set mapped_data = ir.mapped_data || jsonb_build_object('_category_id', cat.id)
  from public.student_category cat
  where ir.id in (select id from _validate_chunk) and ir.validation_status = 'pending'
    and coalesce(trim(ir.mapped_data->>'category_key'), '') <> ''
    and cat.school_id = p_school_id and lower(trim(cat.key)) = lower(trim(ir.mapped_data->>'category_key'));
  update public.import_row
  set validation_status = 'rejected', rejection_reason = 'Unknown category_key for this school', action = null
  where id in (select id from _validate_chunk) and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'category_key'), '') <> '' and not (mapped_data ? '_category_id');

  update public.import_row ir
  set mapped_data = ir.mapped_data || jsonb_build_object('_house_id', h.id)
  from public.house h
  where ir.id in (select id from _validate_chunk) and ir.validation_status = 'pending'
    and coalesce(trim(ir.mapped_data->>'house_name'), '') <> ''
    and h.school_id = p_school_id and lower(trim(h.name)) = lower(trim(ir.mapped_data->>'house_name'));
  update public.import_row
  set validation_status = 'rejected', rejection_reason = 'Unknown house_name for this school', action = null
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
  where batch_id = p_batch_id and validation_status = 'pending' and coalesce(trim(mapped_data->>'gender'), '') <> '';
  update public.import_row
  set validation_status = 'rejected', rejection_reason = 'Invalid gender (expected male, female, or other)'
  where batch_id = p_batch_id and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'gender'), '') <> '' and mapped_data->>'gender' not in ('male', 'female', 'other');

  update public.import_row
  set validation_status = 'rejected', rejection_reason = 'Invalid dob format (expected YYYY-MM-DD)'
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
    set validation_status = 'rejected', rejection_reason = 'Duplicate employee_code within this file'
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
    set validation_status = 'rejected', rejection_reason = 'Duplicate employee_code within this file'
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
    set validation_status = 'rejected', rejection_reason = 'employee_code already exists for this school'
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
  set validation_status = 'rejected', rejection_reason = 'Unknown department_name for this school', action = null
  where id in (select id from _validate_chunk) and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'department_name'), '') <> '' and not (mapped_data ? '_department_id');

  update public.import_row ir
  set mapped_data = ir.mapped_data || jsonb_build_object('_designation_id', des.id)
  from public.designation des
  where ir.id in (select id from _validate_chunk) and ir.validation_status = 'pending'
    and coalesce(trim(ir.mapped_data->>'designation_name'), '') <> ''
    and des.school_id = p_school_id and lower(trim(des.name)) = lower(trim(ir.mapped_data->>'designation_name'));
  update public.import_row
  set validation_status = 'rejected', rejection_reason = 'Unknown designation_name for this school', action = null
  where id in (select id from _validate_chunk) and validation_status = 'pending'
    and coalesce(trim(mapped_data->>'designation_name'), '') <> '' and not (mapped_data ? '_designation_id');

  update public.import_row
  set validation_status = 'valid'
  where id in (select id from _validate_chunk) and validation_status = 'pending';
end;
$$;

-- Orchestrator: phase 1 runs once (on the call that finds status = 'staged'); every call runs
-- one phase-2 chunk. Returns the same {remaining, done} shape as fn_commit_import_batch so the
-- client-side loop pattern (packages/db/tests/import-volume.test.ts,
-- lib/core/import/actions.ts) is identical for both.
create or replace function public.fn_validate_import_batch(p_batch_id uuid, p_limit int default 300)
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
  if v_batch.status not in ('staged', 'validating') then
    raise exception 'Batch % is not staged (currently %)', p_batch_id, v_batch.status;
  end if;

  if v_batch.status = 'staged' then
    update public.import_row set validation_status = 'pending', rejection_reason = null, action = null where batch_id = p_batch_id;
    if v_batch.entity_type = 'student' then
      perform public.fn_validate_student_phase1(p_batch_id, v_batch.match_mode);
    else
      perform public.fn_validate_staff_phase1(p_batch_id, v_batch.match_mode);
    end if;
    update public.import_batch set status = 'validating' where id = p_batch_id;
  end if;

  if v_batch.entity_type = 'student' then
    perform public.fn_validate_student_phase2(p_batch_id, v_batch.school_id, v_batch.match_mode, p_limit);
  else
    perform public.fn_validate_staff_phase2(p_batch_id, v_batch.school_id, v_batch.match_mode, p_limit);
  end if;

  select count(*) into v_remaining from public.import_row where batch_id = p_batch_id and validation_status = 'pending';

  if v_remaining = 0 then
    update public.import_batch
    set status = 'validated',
        total_rows = (select count(*) from public.import_row where batch_id = p_batch_id),
        created_count = (select count(*) from public.import_row where batch_id = p_batch_id and action = 'create'),
        updated_count = (select count(*) from public.import_row where batch_id = p_batch_id and action = 'update'),
        rejected_count = (select count(*) from public.import_row where batch_id = p_batch_id and validation_status = 'rejected')
    where id = p_batch_id;
  end if;

  return jsonb_build_object('remaining', v_remaining, 'done', v_remaining = 0);
end;
$$;

grant execute on function public.fn_validate_student_phase1(uuid, text) to authenticated;
grant execute on function public.fn_validate_student_phase2(uuid, uuid, text, int) to authenticated;
grant execute on function public.fn_validate_staff_phase1(uuid, text) to authenticated;
grant execute on function public.fn_validate_staff_phase2(uuid, uuid, text, int) to authenticated;
grant execute on function public.fn_validate_import_batch(uuid, int) to authenticated;
