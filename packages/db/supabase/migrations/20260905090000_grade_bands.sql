-- Grading rules -- a P0 Master Data item (docs/schoolerp_features.md §A) that was never built,
-- discovered as a hard prerequisite while starting Exams (P1 weeks 11-12): grade/GPA calculation
-- needs a configurable set of percentage bands to map marks onto. One flat set of bands per
-- school (not multiple named "scales") -- nothing in the spec asks for more than one grading
-- scheme per school, and CLAUDE.md's phase discipline says don't build for a need nobody's
-- asked for yet.
create table public.grade_band (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  min_percentage numeric(5, 2) not null check (min_percentage >= 0 and min_percentage <= 100),
  max_percentage numeric(5, 2) not null check (max_percentage >= 0 and max_percentage <= 100),
  grade_label text not null,
  grade_point numeric(4, 2),
  remark text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (min_percentage <= max_percentage)
);

create trigger trg_grade_band_set_updated_at
  before update on public.grade_band
  for each row execute function public.set_updated_at();

alter table public.grade_band enable row level security;

-- Same permission as the rest of Master Data (school.manage_master_data) -- grading rules are
-- exactly that: school configuration, not a separate Exams-only concern. Broad read (any
-- authenticated school member can see the grading scheme, same rationale as class/section/etc),
-- write gated by the permission.
grant select, insert, update, delete on public.grade_band to authenticated;

create policy grade_band_select on public.grade_band for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());

create policy grade_band_write on public.grade_band for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_master_data')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_master_data')) or public.is_super_admin());

-- Resolves a percentage to its grade label -- the one place this logic lives, called by both the
-- marks-entry UI (live grade preview) and report card generation, so they can never disagree
-- about what grade a given percentage maps to. Returns null (not an error) when no band covers
-- the percentage -- an incomplete grading scheme is a school setup gap, not an exam-time failure.
create or replace function public.fn_resolve_grade(p_school_id uuid, p_percentage numeric)
returns table (grade_label text, grade_point numeric, remark text)
language sql
stable
as $$
  select gb.grade_label, gb.grade_point, gb.remark
  from public.grade_band gb
  where gb.school_id = p_school_id
    and p_percentage >= gb.min_percentage
    and p_percentage <= gb.max_percentage
  order by gb.min_percentage desc
  limit 1;
$$;

grant execute on function public.fn_resolve_grade(uuid, numeric) to authenticated;
