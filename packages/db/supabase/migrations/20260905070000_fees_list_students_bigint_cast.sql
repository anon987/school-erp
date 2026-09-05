-- fn_list_students failed on every call: "Returned type numeric does not match expected type
-- bigint in column 10" (due_amount_paise). sum(bigint) returns numeric in Postgres, not bigint,
-- so the fee CTE's computed column didn't match the function's declared `returns table` type.
-- Caught by directly invoking the RPC before relying on it from the UI. Same signature as
-- before, so a plain CREATE OR REPLACE (no arity change, no overload risk this time).

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
      (sum(i.total_amount_paise) - coalesce(sum(pay.paid_amount), 0))::bigint as due_amount_paise
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
      coalesce(fee.due_amount_paise, 0::bigint) as due_amount_paise,
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
