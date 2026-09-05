-- P1 Exams (docs/schoolerp_features.md §G): exam/term setup, subject-wise max marks with an
-- optional internal/external split, marks entry with validation, and a result approval workflow
-- before publishing. Grade/GPA calculation reads fn_resolve_grade (previous migration).
-- Explicitly NOT here: publishing to the parent portal (P2), re-evaluation workflow (P3).

insert into public.permission (key, label) values
  ('school.manage_exams', 'Set up exams and subjects, enter marks'),
  ('school.approve_exam_results', 'Approve and publish exam results');

insert into public.role_permission (role_id, permission_id)
select r.id, p.id from public.role r, public.permission p
where r.key in ('school_owner', 'school_admin', 'principal', 'teacher') and p.key = 'school.manage_exams';

insert into public.role_permission (role_id, permission_id)
select r.id, p.id from public.role r, public.permission p
where r.key in ('school_owner', 'school_admin', 'principal') and p.key = 'school.approve_exam_results';

-- status is app-managed, not trigger-enforced: draft -> marks_entry -> pending_approval ->
-- approved -> published, with an explicit "reopen" (approved/published -> marks_entry) escape
-- hatch for corrections, gated by school.approve_exam_results in the server action. Kept in the
-- app layer rather than a DB trigger -- same complexity trade-off as import_batch.status.
--
-- compute_ranks is "ranks/positions (optional per school)" from the spec -- decided per exam,
-- computed at query time from `mark`, not stored redundantly.
create table public.exam (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  academic_year_id uuid not null references public.academic_year(id) on delete cascade,
  name text not null,
  term text,
  start_date date,
  end_date date,
  status text not null default 'draft' check (status in ('draft', 'marks_entry', 'pending_approval', 'approved', 'published')),
  compute_ranks boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, academic_year_id, name)
);

create trigger trg_exam_set_updated_at before update on public.exam for each row execute function public.set_updated_at();
alter table public.exam enable row level security;

-- max_marks is the TOTAL for the subject (e.g. 100); when has_internal, internal_max_marks is
-- the portion of that total set aside for internal assessment (e.g. 20 of 100) -- external is
-- implicitly max_marks - internal_max_marks, not a separately stored column.
create table public.exam_subject (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exam(id) on delete cascade,
  class_id uuid not null references public.class(id) on delete cascade,
  subject_id uuid not null references public.subject(id) on delete cascade,
  max_marks numeric(6, 2) not null check (max_marks > 0),
  pass_marks numeric(6, 2) not null check (pass_marks >= 0),
  has_internal boolean not null default false,
  internal_max_marks numeric(6, 2) check (internal_max_marks >= 0),
  created_at timestamptz not null default now(),
  unique (exam_id, class_id, subject_id),
  check (pass_marks <= max_marks),
  check (not has_internal or (internal_max_marks is not null and internal_max_marks <= max_marks)),
  check (has_internal or internal_max_marks is null)
);

alter table public.exam_subject enable row level security;

-- One row per student per exam_subject. marks_obtained is the external component when
-- has_internal (validated against max_marks - internal_max_marks by the trigger below, not a
-- plain CHECK -- it needs exam_subject's own columns, a different table).
create table public.mark (
  id uuid primary key default gen_random_uuid(),
  exam_subject_id uuid not null references public.exam_subject(id) on delete cascade,
  student_id uuid not null references public.student(id) on delete cascade,
  marks_obtained numeric(6, 2) check (marks_obtained >= 0),
  internal_marks_obtained numeric(6, 2) check (internal_marks_obtained >= 0),
  is_absent boolean not null default false,
  remarks text,
  entered_by_auth_user_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exam_subject_id, student_id),
  check (is_absent or marks_obtained is not null)
);

create trigger trg_mark_set_updated_at before update on public.mark for each row execute function public.set_updated_at();
alter table public.mark enable row level security;

create or replace function public.fn_validate_mark()
returns trigger
language plpgsql
as $$
declare
  v_max_marks numeric;
  v_internal_max numeric;
  v_has_internal boolean;
begin
  select max_marks, internal_max_marks, has_internal into v_max_marks, v_internal_max, v_has_internal
  from public.exam_subject where id = new.exam_subject_id;

  if new.is_absent then
    return new;
  end if;

  if v_has_internal then
    if new.marks_obtained > (v_max_marks - v_internal_max) then
      raise exception 'marks_obtained (%) exceeds the external max (%) for this subject', new.marks_obtained, v_max_marks - v_internal_max;
    end if;
    if new.internal_marks_obtained is not null and new.internal_marks_obtained > v_internal_max then
      raise exception 'internal_marks_obtained (%) exceeds internal max (%) for this subject', new.internal_marks_obtained, v_internal_max;
    end if;
  else
    if new.marks_obtained > v_max_marks then
      raise exception 'marks_obtained (%) exceeds max_marks (%) for this subject', new.marks_obtained, v_max_marks;
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_mark_validate before insert or update on public.mark for each row execute function public.fn_validate_mark();

-- ---------------------------------------------------------------------------
-- RLS -- same shape as Fees: broad-read (school_id = current_school_id()), write gated by
-- school.manage_exams. exam_subject/mark have no school_id of their own -- traversed through
-- exam, same pattern as invoice_line -> invoice.
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.exam, public.exam_subject, public.mark to authenticated;

create policy exam_select on public.exam for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy exam_write on public.exam for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_exams')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_exams')) or public.is_super_admin());

create policy exam_subject_select on public.exam_subject for select to authenticated
  using (exists (select 1 from public.exam e where e.id = exam_subject.exam_id and (e.school_id = public.current_school_id() or public.is_super_admin())));
create policy exam_subject_write on public.exam_subject for all to authenticated
  using (exists (select 1 from public.exam e where e.id = exam_subject.exam_id and e.school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_exams')) or public.is_super_admin())
  with check (exists (select 1 from public.exam e where e.id = exam_subject.exam_id and e.school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_exams')) or public.is_super_admin());

create policy mark_select on public.mark for select to authenticated
  using (exists (
    select 1 from public.exam_subject es join public.exam e on e.id = es.exam_id
    where es.id = mark.exam_subject_id and (e.school_id = public.current_school_id() or public.is_super_admin())
  ));
create policy mark_write on public.mark for all to authenticated
  using (exists (
    select 1 from public.exam_subject es join public.exam e on e.id = es.exam_id
    where es.id = mark.exam_subject_id and e.school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_exams')
  ) or public.is_super_admin())
  with check (exists (
    select 1 from public.exam_subject es join public.exam e on e.id = es.exam_id
    where es.id = mark.exam_subject_id and e.school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_exams')
  ) or public.is_super_admin());
