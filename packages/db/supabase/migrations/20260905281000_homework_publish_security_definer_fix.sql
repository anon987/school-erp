-- fn_publish_homework was SECURITY INVOKER, but homework_submission deliberately has NO insert
-- policy for `authenticated` at all (same "writes only happen through a function" shape as
-- `notification` in the Communication migration) -- meaning the function's own insert was
-- rejected with "new row violates row-level security policy for table homework_submission" even
-- for a caller with homework.manage, since SECURITY INVOKER is still subject to RLS as the
-- calling role. Found by live-verifying the publish flow end to end, not by inspection.
--
-- Fix: SECURITY DEFINER, matching fn_publish_notice_internal's shape (Communication migration).
-- The function's own body already re-checks the tenant boundary (current_school_id() =
-- p_school_id) and the caller's permission (homework.manage OR homework.manage_own +
-- fn_owns_staff_class_subject) before doing anything -- those checks were already correct, only
-- the SECURITY property was wrong.
create or replace function public.fn_publish_homework(p_homework_id uuid, p_school_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_homework record;
begin
  if not (public.current_school_id() = p_school_id or public.is_super_admin()) then
    raise exception 'Forbidden: % is not the caller''s school', p_school_id;
  end if;

  select * into v_homework from public.homework where id = p_homework_id and school_id = p_school_id for update;
  if not found then
    raise exception 'Homework % not found in school %', p_homework_id, p_school_id;
  end if;
  if v_homework.published_at is not null then
    raise exception 'Homework % has already been published', p_homework_id;
  end if;
  if not (
    public.fn_has_permission(public.current_roles(), 'homework.manage')
    or (public.fn_has_permission(public.current_roles(), 'homework.manage_own') and public.fn_owns_staff_class_subject(v_homework.staff_class_subject_id))
    or public.is_super_admin()
  ) then
    raise exception 'Forbidden: no permission to publish this homework';
  end if;

  insert into public.homework_submission (school_id, homework_id, student_id)
  select p_school_id, p_homework_id, e.student_id
  from public.enrollment e
  where e.school_id = p_school_id and e.class_id = v_homework.class_id and e.section_id = v_homework.section_id and e.academic_year_id = v_homework.academic_year_id
  on conflict (homework_id, student_id) do nothing;

  update public.homework set published_at = now() where id = p_homework_id;
end;
$$;
