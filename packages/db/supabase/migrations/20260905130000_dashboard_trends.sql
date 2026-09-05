-- Dashboard trend widgets (docs/schoolerp_launchplan.md P1 weeks 11-12: "trend charts
-- (attendance/collection/admissions)").
--
-- Both anchor "today" to Asia/Kolkata explicitly (`now() at time zone 'Asia/Kolkata'`), not bare
-- `current_date` -- the Postgres server's own timezone (likely UTC on Supabase) would otherwise
-- shift the day boundary by up to 5.5 hours from what an IST user means by "today", the same
-- class of bug CLAUDE.md's dateIst.ts exists to prevent at the app layer.

create or replace function public.fn_attendance_trend(p_school_id uuid, p_academic_year_id uuid, p_days int default 7)
returns table (attendance_date date, percent numeric)
language sql
stable
as $$
  with anchor as (
    select (now() at time zone 'Asia/Kolkata')::date as today
  ),
  days as (
    select (anchor.today - i)::date as d
    from anchor, generate_series(0, p_days - 1) as i
  ),
  marks as (
    select
      ar.attendance_date,
      sum(case when ar.status in ('present', 'late') then 1 when ar.status = 'half_day' then 0.5 else 0 end) as effective_present,
      count(*) filter (where ar.status <> 'leave') as counted
    from public.attendance_record ar, anchor
    where ar.school_id = p_school_id and ar.attendance_date >= anchor.today - (p_days - 1)
    group by ar.attendance_date
  )
  select d.d, case when m.counted > 0 then round(m.effective_present / m.counted * 100, 1) else null end
  from days d
  left join marks m on m.attendance_date = d.d
  order by d.d;
$$;

grant execute on function public.fn_attendance_trend(uuid, uuid, int) to authenticated;

create or replace function public.fn_collection_trend(p_school_id uuid, p_days int default 7)
returns table (collection_date date, total_paise bigint)
language sql
stable
as $$
  with anchor as (
    select (now() at time zone 'Asia/Kolkata')::date as today
  ),
  days as (
    select (anchor.today - i)::date as d
    from anchor, generate_series(0, p_days - 1) as i
  ),
  collected as (
    select
      ((p.created_at at time zone 'Asia/Kolkata')::date) as collection_date,
      coalesce(sum(p.amount_paise), 0) as total_paise
    from public.payment p
    where p.school_id = p_school_id
      and p.status in ('recorded', 'captured')
      and (p.created_at at time zone 'Asia/Kolkata')::date >= (select today - (p_days - 1) from anchor)
    group by 1
  )
  select d.d, coalesce(c.total_paise, 0)
  from days d
  left join collected c on c.collection_date = d.d
  order by d.d;
$$;

grant execute on function public.fn_collection_trend(uuid, int) to authenticated;

-- New student records created per day -- `student` has no dedicated admission_date column (only
-- `status_since`, which tracks status changes, not the original admission), so created_at is the
-- closest real signal. Caveat worth knowing when reading this chart: a bulk import (like the
-- pilot school's initial data load) creates every historical student on the same day, so the
-- trend only becomes a meaningful "new admissions" signal going forward from go-live, not for
-- backfilled history.
create or replace function public.fn_admissions_trend(p_school_id uuid, p_days int default 7)
returns table (admission_date date, new_students int)
language sql
stable
as $$
  with anchor as (
    select (now() at time zone 'Asia/Kolkata')::date as today
  ),
  days as (
    select (anchor.today - i)::date as d
    from anchor, generate_series(0, p_days - 1) as i
  ),
  created as (
    select ((s.created_at at time zone 'Asia/Kolkata')::date) as admission_date, count(*) as new_students
    from public.student s, anchor
    where s.school_id = p_school_id
      and (s.created_at at time zone 'Asia/Kolkata')::date >= anchor.today - (p_days - 1)
    group by 1
  )
  select d.d, coalesce(c.new_students, 0)::int
  from days d
  left join created c on c.admission_date = d.d
  order by d.d;
$$;

grant execute on function public.fn_admissions_trend(uuid, int) to authenticated;

-- Today's and month-to-date collection totals in one call (dashboard KPI cards), IST-anchored
-- for the same reason as the trend functions above.
create or replace function public.fn_collection_kpis(p_school_id uuid)
returns table (today_paise bigint, month_to_date_paise bigint)
language sql
stable
as $$
  with anchor as (
    select (now() at time zone 'Asia/Kolkata')::date as today
  )
  select
    coalesce(sum(p.amount_paise) filter (where (p.created_at at time zone 'Asia/Kolkata')::date = anchor.today), 0),
    coalesce(sum(p.amount_paise) filter (where date_trunc('month', p.created_at at time zone 'Asia/Kolkata') = date_trunc('month', anchor.today::timestamp)), 0)
  from anchor
  left join public.payment p on p.school_id = p_school_id and p.status in ('recorded', 'captured')
    and (p.created_at at time zone 'Asia/Kolkata') >= date_trunc('month', anchor.today::timestamp)
  group by anchor.today;
$$;

grant execute on function public.fn_collection_kpis(uuid) to authenticated;
