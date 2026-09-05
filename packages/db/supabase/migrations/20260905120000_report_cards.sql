-- Report card generation (docs/schoolerp_features.md §G): a configurable template (which
-- sections show), not a WYSIWYG designer -- confirmed with the user given no sample report card
-- exists anywhere to match pixel-for-pixel. One settings row per school, same shape as
-- school_branding/receipt design.
create table public.report_card_settings (
  school_id uuid primary key references public.school(id) on delete cascade,
  show_attendance boolean not null default true,
  show_remarks boolean not null default true,
  show_rank boolean not null default false,
  footer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_report_card_settings_set_updated_at
  before update on public.report_card_settings
  for each row execute function public.set_updated_at();

alter table public.report_card_settings enable row level security;

grant select, insert, update, delete on public.report_card_settings to authenticated;

create policy report_card_settings_select on public.report_card_settings for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());

-- Gated by school.manage_exams, not school.manage_branding -- unlike the Fees receipt design
-- table, this doesn't touch the school's logo/colors/display name, just exam-related toggles, so
-- the natural permission boundary is the Exams one.
create policy report_card_settings_write on public.report_card_settings for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_exams')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_exams')) or public.is_super_admin());

-- Per-student totals + rank within one class, for one exam -- every enrolled student x every
-- exam_subject for that class, LEFT JOIN mark so a subject with no mark entered yet still counts
-- its max_marks toward total_max (rather than silently shrinking the denominator), and an absent
-- or ungraded subject contributes 0 to total_obtained (coalesce), not "excluded from the average."
-- Security invoker (not definer): RLS on enrollment/exam_subject/mark still applies as the
-- calling user, same reasoning as every other RPC in this module.
create or replace function public.fn_exam_class_results(p_exam_id uuid, p_class_id uuid)
returns table (student_id uuid, total_obtained numeric, total_max numeric, percentage numeric, rank int)
language sql
stable
as $$
  with candidates as (
    select distinct e.student_id
    from public.enrollment e
    join public.exam ex on ex.id = p_exam_id
    where e.class_id = p_class_id and e.academic_year_id = ex.academic_year_id
  ),
  totals as (
    select
      c.student_id,
      coalesce(sum(coalesce(m.marks_obtained, 0) + coalesce(m.internal_marks_obtained, 0)), 0) as total_obtained,
      coalesce(sum(es.max_marks), 0) as total_max
    from candidates c
    cross join public.exam_subject es
    left join public.mark m on m.exam_subject_id = es.id and m.student_id = c.student_id
    where es.exam_id = p_exam_id and es.class_id = p_class_id
    group by c.student_id
  )
  select
    student_id,
    total_obtained,
    total_max,
    case when total_max > 0 then round(total_obtained / total_max * 100, 2) else 0 end as percentage,
    rank() over (order by total_obtained desc)::int as rank
  from totals;
$$;

grant execute on function public.fn_exam_class_results(uuid, uuid) to authenticated;
