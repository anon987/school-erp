-- fn_report_card_setup_results needs `rank` (missed in the original migration -- Report Card
-- Setup's "Show class rank" needs it, matching fn_exam_class_results). Postgres won't let
-- CREATE OR REPLACE change a function's return columns, so this drops and recreates it (the
-- return-type-change version of the "different arg count creates a new overload" lesson from
-- fn_generate_yearly_invoices earlier this session).
drop function public.fn_report_card_setup_results(uuid, uuid);

create or replace function public.fn_report_card_setup_results(p_setup_id uuid, p_class_id uuid)
returns table (student_id uuid, weighted_percentage numeric, rank int, exams_counted int)
language sql
stable
as $$
  with total_weight as (
    select sum(weight_percent) as w from public.report_card_setup_exam where setup_id = p_setup_id
  ),
  per_exam as (
    select r.student_id, r.percentage, rse.weight_percent
    from public.report_card_setup_exam rse
    cross join lateral public.fn_exam_class_results(rse.exam_id, p_class_id) r
    where rse.setup_id = p_setup_id
  ),
  agg as (
    select per_exam.student_id,
           round(sum(per_exam.percentage * per_exam.weight_percent) / (select w from total_weight), 2) as weighted_percentage,
           count(*)::int as exams_counted
    from per_exam
    group by per_exam.student_id
    having count(*) = (select count(*) from public.report_card_setup_exam where setup_id = p_setup_id)
  )
  select student_id, weighted_percentage, rank() over (order by weighted_percentage desc)::int, exams_counted
  from agg;
$$;

grant execute on function public.fn_report_card_setup_results(uuid, uuid) to authenticated;
