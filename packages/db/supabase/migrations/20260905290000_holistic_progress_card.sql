-- P2 Holistic Progress Card (docs/schoolerp_features.md §H): "Report card template variant
-- (academic + co-curricular + behavioural) extending existing exams/report-card infra." Explicitly
-- held back from the admit-cards/report-card-setups migration (20260905170000) -- see that file's
-- header comment ("Cocurricular Areas/Grades ... explicitly held back for P2 (Holistic Progress
-- Card)"). No external HPC dependency; this is the in-house academic (existing) + co-curricular +
-- life-skills variant.
--
-- Shape decisions:
-- * hpc_criterion / hpc_rating_scale are school-configurable master data -- same bare-lookup shape
--   as grade_band/period (packages/db 20260905090000, 20260905270000), surfaced on the Master Data
--   settings page like those two, not a new exams-only admin surface.
-- * hpc_assessment attaches to report_card_setup (not to a single exam) because HPC ratings are a
--   per-TERM judgement, entered once regardless of how many exams feed that term's academic
--   percentage -- the same reason report_card_setup itself exists as a distinct concept from exam.
-- * Write access is school.manage_exams, matching marks entry's existing broad model: there is no
--   per-subject-teacher restriction on entering marks today, so HPC ratings don't invent a
--   narrower one either.
-- * No parent-portal read policy on hpc_assessment: report_card_setup/report_card_setup_exam have
--   none today (no report-card portal page exists at all yet), so hpc_assessment follows the same
--   staff-only shape rather than a wider one just for this table.

-- ---------------------------------------------------------------------------
-- Master data: co-curricular / life-skill criteria to rate.
-- ---------------------------------------------------------------------------
create table public.hpc_criterion (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  category text not null check (category in ('co_curricular', 'life_skill')),
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, category, name)
);

create trigger trg_hpc_criterion_set_updated_at before update on public.hpc_criterion for each row execute function public.set_updated_at();
alter table public.hpc_criterion enable row level security;

grant select, insert, update, delete on public.hpc_criterion to authenticated;

create policy hpc_criterion_select on public.hpc_criterion for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy hpc_criterion_write on public.hpc_criterion for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_master_data')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_master_data')) or public.is_super_admin());

-- ---------------------------------------------------------------------------
-- Master data: qualitative rating scale (e.g. A/Excellent .. D/Needs Improvement). Deliberately
-- separate from grade_band, which is percentage-range-derived for academic marks -- HPC ratings
-- are assigned directly by a teacher, not computed from a number.
-- ---------------------------------------------------------------------------
create table public.hpc_rating_scale (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  code text not null,
  label text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, code)
);

create trigger trg_hpc_rating_scale_set_updated_at before update on public.hpc_rating_scale for each row execute function public.set_updated_at();
alter table public.hpc_rating_scale enable row level security;

grant select, insert, update, delete on public.hpc_rating_scale to authenticated;

create policy hpc_rating_scale_select on public.hpc_rating_scale for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy hpc_rating_scale_write on public.hpc_rating_scale for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_master_data')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_master_data')) or public.is_super_admin());

-- ---------------------------------------------------------------------------
-- A report card setup opts in to an HPC section.
-- ---------------------------------------------------------------------------
alter table public.report_card_setup add column include_hpc boolean not null default false;

-- ---------------------------------------------------------------------------
-- One rating per (setup, student, criterion).
-- ---------------------------------------------------------------------------
create table public.hpc_assessment (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  report_card_setup_id uuid not null references public.report_card_setup(id) on delete cascade,
  student_id uuid not null references public.student(id) on delete cascade,
  criterion_id uuid not null references public.hpc_criterion(id) on delete cascade,
  rating_scale_id uuid not null references public.hpc_rating_scale(id) on delete restrict,
  remarks text,
  entered_by_auth_user_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (report_card_setup_id, student_id, criterion_id)
);

create trigger trg_hpc_assessment_set_updated_at before update on public.hpc_assessment for each row execute function public.set_updated_at();
alter table public.hpc_assessment enable row level security;

grant select, insert, update, delete on public.hpc_assessment to authenticated;

create policy hpc_assessment_select on public.hpc_assessment for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy hpc_assessment_write on public.hpc_assessment for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_exams')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_exams')) or public.is_super_admin());
