-- Fixes a real crash on the pilot school's data volume (2,200 students): both functions below
-- replace a JS-side "fetch every id, then .in(...) against a huge list" pattern with a single
-- SQL query. The .in() version built a request URL with ~2,200 UUIDs packed into a query-string
-- filter -- Supabase's gateway rejects a request that large outright (a flat, stack-free 400),
-- which is exactly what surfaced as "Application error... Digest: 16649811" on Fees Setup.
-- Same lesson as the earlier dashboard/attendance-percentage fixes this build: aggregate in SQL,
-- never in application memory over the full student list.
--
-- Both functions are `language sql stable`, NOT `security definer` -- they run as the calling
-- role, so RLS on enrollment/invoice/payment/student/class/section is still the real backstop
-- (same reasoning already documented on fn_generate_yearly_invoices).

create or replace function public.fn_count_uninvoiced_students(p_school_id uuid, p_academic_year_id uuid)
returns integer
language sql
stable
as $$
  select count(*)::int
  from public.enrollment e
  where e.school_id = p_school_id
    and e.academic_year_id = p_academic_year_id
    and not exists (
      select 1 from public.invoice i
      where i.student_id = e.student_id
        and i.school_id = p_school_id
        and i.academic_year_id = p_academic_year_id
    );
$$;

grant execute on function public.fn_count_uninvoiced_students(uuid, uuid) to authenticated;

-- Replaces getDefaulters' two-step "collect overdue student ids in JS, then .in() against
-- enrollment" -- same crash risk if a large fraction of a big school goes overdue at once.
-- Computes due amount per invoice, aggregates per student, and joins straight to
-- enrollment/student/class/section in one query.
create or replace function public.fn_get_fee_defaulters(p_school_id uuid, p_academic_year_id uuid)
returns table (
  student_id uuid,
  admission_number text,
  first_name text,
  last_name text,
  class_name text,
  section_name text,
  due_amount_paise bigint,
  overdue_invoice_count integer
)
language sql
stable
as $$
  with due as (
    select
      i.id,
      i.student_id,
      i.total_amount_paise - coalesce((
        select sum(p.amount_paise) from public.payment p
        where p.invoice_id = i.id and p.status in ('recorded', 'captured')
      ), 0) as due_amount_paise
    from public.invoice i
    where i.school_id = p_school_id
      and i.academic_year_id = p_academic_year_id
      and i.status in ('pending', 'partially_paid', 'overdue')
      and i.due_date < current_date
  ),
  agg as (
    select due.student_id, sum(due.due_amount_paise) as due_amount_paise, count(*) as overdue_invoice_count
    from due
    where due.due_amount_paise > 0
    group by due.student_id
  )
  select
    a.student_id,
    s.admission_number,
    s.first_name,
    s.last_name,
    c.name as class_name,
    sec.name as section_name,
    a.due_amount_paise,
    a.overdue_invoice_count::int
  from agg a
  join public.student s on s.id = a.student_id
  left join public.enrollment e on e.student_id = a.student_id and e.school_id = p_school_id and e.academic_year_id = p_academic_year_id
  left join public.class c on c.id = e.class_id
  left join public.section sec on sec.id = e.section_id
  order by a.due_amount_paise desc;
$$;

grant execute on function public.fn_get_fee_defaulters(uuid, uuid) to authenticated;
