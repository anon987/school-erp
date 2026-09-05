-- Aggregate stats for the new Exam Dashboard -- computed in SQL, not by fetching every mark/
-- exam_subject row into the app to count in JS (the same lesson as fn_exam_class_results and
-- Fees' large-school query fixes earlier this session). Security invoker: RLS on exam/
-- exam_subject/mark still applies as the calling user.
create or replace function public.fn_exam_dashboard_stats(p_school_id uuid, p_academic_year_id uuid)
returns table (total_subjects bigint, subjects_with_marks bigint, marks_present bigint, marks_absent bigint)
language sql
stable
as $$
  with exam_ids as (
    select id from public.exam where school_id = p_school_id and academic_year_id = p_academic_year_id
  ),
  subjects as (
    select id from public.exam_subject where exam_id in (select id from exam_ids)
  ),
  marks as (
    select * from public.mark where exam_subject_id in (select id from subjects)
  )
  select
    (select count(*) from subjects) as total_subjects,
    (select count(distinct exam_subject_id) from marks) as subjects_with_marks,
    (select count(*) from marks where is_absent = false) as marks_present,
    (select count(*) from marks where is_absent = true) as marks_absent;
$$;

grant execute on function public.fn_exam_dashboard_stats(uuid, uuid) to authenticated;
