-- Two additions, both requested alongside Fees Setup work:
-- 1. Class-wise invoice generation -- fn_generate_yearly_invoices/fn_count_uninvoiced_students
--    gain an optional p_class_id filter, defaulting to null (all classes, existing behavior
--    unchanged for every existing caller).
-- 2. A per-student fee status (paid / has dues / no invoices yet) usable both to annotate the
--    Students directory (as a column) and to filter it -- computed in one SQL function, not by
--    fetching per-student data into JS (same lesson as every other large-school fix this build).

create or replace function public.fn_count_uninvoiced_students(p_school_id uuid, p_academic_year_id uuid, p_class_id uuid default null)
returns integer
language sql
stable
as $$
  select count(*)::int
  from public.enrollment e
  where e.school_id = p_school_id
    and e.academic_year_id = p_academic_year_id
    and (p_class_id is null or e.class_id = p_class_id)
    and not exists (
      select 1 from public.invoice i
      where i.student_id = e.student_id
        and i.school_id = p_school_id
        and i.academic_year_id = p_academic_year_id
    );
$$;

grant execute on function public.fn_count_uninvoiced_students(uuid, uuid, uuid) to authenticated;

create or replace function public.fn_generate_yearly_invoices(
  p_school_id uuid,
  p_academic_year_id uuid,
  p_after_student_id uuid default null,
  p_limit int default 50,
  p_class_id uuid default null
)
returns jsonb
language plpgsql
as $$
declare
  v_student record;
  v_structure_id uuid;
  v_installment record;
  v_item record;
  v_concession_pct numeric;
  v_concession_fixed bigint;
  v_line_amount bigint;
  v_concession_amount bigint;
  v_invoice_id uuid;
  v_invoice_total bigint;
  v_invoice_number text;
  v_remaining int;
  v_processed int := 0;
  v_invoiced int := 0;
  v_skipped_no_structure int := 0;
  v_last_student_id uuid := p_after_student_id;
begin
  create temporary table _invoice_lines (fee_head_id uuid, amount_paise bigint, concession_amount_paise bigint) on commit drop;

  for v_student in
    select s.id as student_id, s.category_id, e.class_id
    from public.student s
    join public.enrollment e on e.student_id = s.id and e.academic_year_id = p_academic_year_id
    where s.school_id = p_school_id
      and (p_after_student_id is null or s.id > p_after_student_id)
      and (p_class_id is null or e.class_id = p_class_id)
    order by s.id
    limit p_limit
  loop
    v_processed := v_processed + 1;
    v_last_student_id := v_student.student_id;

    continue when exists (select 1 from public.invoice i where i.student_id = v_student.student_id and i.academic_year_id = p_academic_year_id);

    select fee_structure_id into v_structure_id
    from public.student_fee_assignment
    where student_id = v_student.student_id and academic_year_id = p_academic_year_id;

    if v_structure_id is null then
      select id into v_structure_id from public.fee_structure
      where school_id = p_school_id and academic_year_id = p_academic_year_id
        and class_id = v_student.class_id and category_id = v_student.category_id;
    end if;
    if v_structure_id is null then
      select id into v_structure_id from public.fee_structure
      where school_id = p_school_id and academic_year_id = p_academic_year_id
        and class_id = v_student.class_id and category_id is null;
    end if;

    if v_structure_id is null then
      v_skipped_no_structure := v_skipped_no_structure + 1;
      continue;
    end if;

    for v_installment in
      select id, sequence_number, due_date from public.installment
      where school_id = p_school_id and academic_year_id = p_academic_year_id
      order by sequence_number
    loop
      v_invoice_total := 0;
      delete from _invoice_lines where true;

      for v_item in
        select fee_head_id, amount_paise, one_time_installment_number
        from public.fee_structure_item
        where fee_structure_id = v_structure_id
          and (one_time_installment_number is null or one_time_installment_number = v_installment.sequence_number)
      loop
        v_line_amount := v_item.amount_paise;

        select percentage_value, fixed_value_paise into v_concession_pct, v_concession_fixed
        from public.concession_rule
        where school_id = p_school_id and academic_year_id = p_academic_year_id
          and category_id = v_student.category_id
          and (fee_head_id = v_item.fee_head_id or fee_head_id is null)
        order by fee_head_id nulls last
        limit 1;

        if v_concession_pct is not null then
          v_concession_amount := least(v_line_amount, round(v_line_amount * v_concession_pct / 100.0));
        elsif v_concession_fixed is not null then
          v_concession_amount := least(v_line_amount, v_concession_fixed);
        else
          v_concession_amount := 0;
        end if;

        insert into _invoice_lines values (v_item.fee_head_id, v_line_amount, v_concession_amount);
        v_invoice_total := v_invoice_total + (v_line_amount - v_concession_amount);
        v_concession_pct := null;
        v_concession_fixed := null;
      end loop;

      if not exists (select 1 from _invoice_lines) then
        continue;
      end if;

      v_invoice_number := public.fn_next_school_number(p_school_id, 'fee_invoice');

      insert into public.invoice (school_id, student_id, academic_year_id, installment_id, invoice_number, due_date, total_amount_paise)
      values (p_school_id, v_student.student_id, p_academic_year_id, v_installment.id, v_invoice_number, v_installment.due_date, v_invoice_total)
      returning id into v_invoice_id;

      insert into public.invoice_line (invoice_id, fee_head_id, amount_paise, concession_amount_paise)
      select v_invoice_id, fee_head_id, amount_paise, concession_amount_paise from _invoice_lines;
    end loop;

    v_invoiced := v_invoiced + 1;
  end loop;

  select count(*) into v_remaining
  from public.student s
  join public.enrollment e on e.student_id = s.id and e.academic_year_id = p_academic_year_id
  where s.school_id = p_school_id
    and (v_last_student_id is null or s.id > v_last_student_id)
    and (p_class_id is null or e.class_id = p_class_id);

  return jsonb_build_object(
    'processed', v_processed,
    'invoiced', v_invoiced,
    'skippedNoStructure', v_skipped_no_structure,
    'remaining', v_remaining,
    'done', v_processed < p_limit,
    'lastStudentId', v_last_student_id
  );
end;
$$;

grant execute on function public.fn_generate_yearly_invoices(uuid, uuid, uuid, int, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Students directory fee status: replaces listStudents' plain PostgREST query with one SQL
-- function so search/class/section/fee-status filters, sorting, and pagination all happen in the
-- database in a single pass -- never a `.in()` built from a JS-collected id list (the same class
-- of bug fixed earlier for Fees Setup). `language plpgsql stable`, NOT security definer: RLS on
-- student/enrollment/invoice/payment still applies as the calling user, same reasoning already
-- used for fn_generate_yearly_invoices and fn_get_fee_defaulters.
-- ---------------------------------------------------------------------------
create or replace function public.fn_list_students(
  p_school_id uuid,
  p_academic_year_id uuid,
  p_search text default null,
  p_class_id uuid default null,
  p_section_id uuid default null,
  p_fee_status text default null,
  p_sort text default 'name',
  p_dir text default 'asc',
  p_limit int default 25,
  p_offset int default 0
)
returns table (
  id uuid,
  admission_number text,
  first_name text,
  last_name text,
  status text,
  gender text,
  class_name text,
  section_name text,
  roll_number text,
  due_amount_paise bigint,
  has_invoices boolean,
  total_count bigint
)
language plpgsql
stable
as $$
declare
  v_search text := nullif(trim(coalesce(p_search, '')), '');
begin
  return query
  with fee as (
    select
      i.student_id,
      sum(i.total_amount_paise) - coalesce(sum(pay.paid_amount), 0) as due_amount_paise
    from public.invoice i
    left join lateral (
      select sum(p.amount_paise) as paid_amount
      from public.payment p
      where p.invoice_id = i.id and p.status in ('recorded', 'captured')
    ) pay on true
    where i.school_id = p_school_id and i.academic_year_id = p_academic_year_id and i.status <> 'cancelled'
    group by i.student_id
  ),
  base as (
    select
      s.id, s.admission_number, s.first_name, s.last_name, s.status, s.gender,
      c.name as class_name, sec.name as section_name, e.roll_number,
      coalesce(fee.due_amount_paise, 0) as due_amount_paise,
      (fee.student_id is not null) as has_invoices
    from public.student s
    join public.enrollment e on e.student_id = s.id and e.academic_year_id = p_academic_year_id
    left join public.class c on c.id = e.class_id
    left join public.section sec on sec.id = e.section_id
    left join fee on fee.student_id = s.id
    where s.school_id = p_school_id
      and (p_class_id is null or e.class_id = p_class_id)
      and (p_section_id is null or e.section_id = p_section_id)
      and (
        v_search is null
        or s.first_name ilike '%' || v_search || '%'
        or s.last_name ilike '%' || v_search || '%'
        or s.admission_number ilike '%' || v_search || '%'
      )
      and (
        p_fee_status is null
        or (p_fee_status = 'due' and fee.student_id is not null and coalesce(fee.due_amount_paise, 0) > 0)
        or (p_fee_status = 'paid' and fee.student_id is not null and coalesce(fee.due_amount_paise, 0) <= 0)
        or (p_fee_status = 'none' and fee.student_id is null)
      )
  )
  select b.*, count(*) over()::bigint as total_count
  from base b
  order by
    case when p_sort = 'admissionNumber' and p_dir = 'asc' then b.admission_number end asc,
    case when p_sort = 'admissionNumber' and p_dir = 'desc' then b.admission_number end desc,
    case when coalesce(p_sort, 'name') <> 'admissionNumber' and p_dir = 'asc' then b.last_name end asc,
    case when coalesce(p_sort, 'name') <> 'admissionNumber' and p_dir = 'desc' then b.last_name end desc,
    case when coalesce(p_sort, 'name') <> 'admissionNumber' and p_dir = 'asc' then b.first_name end asc,
    case when coalesce(p_sort, 'name') <> 'admissionNumber' and p_dir = 'desc' then b.first_name end desc,
    b.id asc
  limit p_limit offset p_offset;
end;
$$;

grant execute on function public.fn_list_students(uuid, uuid, text, uuid, uuid, text, text, text, int, int) to authenticated;
