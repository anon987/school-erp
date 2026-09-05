-- Admit Cards + weighted multi-exam Report Card Setups (Exams module extension). Not spec'd in
-- docs/schoolerp_features.md under either name -- built after an explicit scope conversation with
-- the user (see the plan file / session notes). Cocurricular Areas/Grades, requested in the same
-- conversation, was explicitly held back for P2 (Holistic Progress Card) and is NOT part of this
-- migration.

-- A real admit card's core value is the datesheet -- there was previously no schedule data
-- anywhere to print. Nullable/additive; editable in place (unlike marks fields, which stay
-- delete-and-recreate-only).
alter table public.exam_subject
  add column exam_date date,
  add column start_time time,
  add column end_time time,
  add column room_no text;

-- School-wide default admit card design -- same shape and template palette as
-- report_card_settings/id_card_settings (the shared 5-design gallery: admit cards are full-page
-- letterhead documents like receipts/report cards, not small photo-centric badges like ID cards).
create table public.admit_card_settings (
  school_id uuid primary key references public.school(id) on delete cascade,
  template text not null default 'classic_bw' check (template in ('classic_bw', 'minimal_bw', 'modern_blue', 'emerald_green', 'amber_gold')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_admit_card_settings_set_updated_at
  before update on public.admit_card_settings
  for each row execute function public.set_updated_at();

alter table public.admit_card_settings enable row level security;

-- Per-exam admit card configuration: release control, fee-defaulter lock, printed content fields,
-- optional template override (null = inherit admit_card_settings.template). release_enabled /
-- available_from / available_until are stored but not enforced anywhere yet -- there is no parent
-- portal in this codebase to release admit cards to. The fee lock and holds (below) DO block
-- generation for everyone, office included, matching the competitor product's own language.
create table public.exam_admit_card_settings (
  exam_id uuid primary key references public.exam(id) on delete cascade,
  school_id uuid not null references public.school(id) on delete cascade,
  template text check (template in ('classic_bw', 'minimal_bw', 'modern_blue', 'emerald_green', 'amber_gold')),
  release_enabled boolean not null default false,
  available_from timestamptz,
  available_until timestamptz,
  fee_lock_mode text not null default 'off' check (fee_lock_mode in ('off', 'block')),
  fee_lock_max_due_paise integer not null default 0 check (fee_lock_max_due_paise >= 0),
  instructions text,
  reporting_time text,
  exam_centre text,
  principal_name text,
  controller_of_exams text,
  hall_ticket_prefix text,
  show_student_photo boolean not null default true,
  show_signature_lines boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_exam_admit_card_settings_set_updated_at
  before update on public.exam_admit_card_settings
  for each row execute function public.set_updated_at();

alter table public.exam_admit_card_settings enable row level security;

-- Per-student, per-exam hold -- independent of the fee lock (e.g. a discipline hold), blocks
-- generation the same way the fee lock does.
create table public.admit_card_hold (
  exam_id uuid not null references public.exam(id) on delete cascade,
  student_id uuid not null references public.student(id) on delete cascade,
  school_id uuid not null references public.school(id) on delete cascade,
  reason text,
  held_by_auth_user_id uuid references auth.users(id),
  held_at timestamptz not null default now(),
  primary key (exam_id, student_id)
);

alter table public.admit_card_hold enable row level security;

-- Named report-card configuration combining one or more exams by weight. is_published is a
-- draft/published status, not "visible to parents" -- there is no parent portal yet to publish
-- to; it gates whether the setup shows in the "generate a report card" flow.
create table public.report_card_setup (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  academic_year_id uuid not null references public.academic_year(id) on delete cascade,
  name text not null,
  template text not null default 'classic_bw' check (template in ('classic_bw', 'minimal_bw', 'modern_blue', 'emerald_green', 'amber_gold')),
  compute_ranks boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, academic_year_id, name)
);

create trigger trg_report_card_setup_set_updated_at
  before update on public.report_card_setup
  for each row execute function public.set_updated_at();

alter table public.report_card_setup enable row level security;

create table public.report_card_setup_exam (
  setup_id uuid not null references public.report_card_setup(id) on delete cascade,
  exam_id uuid not null references public.exam(id) on delete cascade,
  weight_percent numeric(5, 2) not null check (weight_percent > 0 and weight_percent <= 100),
  primary key (setup_id, exam_id)
);

alter table public.report_card_setup_exam enable row level security;

-- ---------------------------------------------------------------------------
-- RLS -- same shape as report_card_settings/id_card_settings: broad select
-- (school_id = current_school_id()), write gated by school.manage_exams.
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on
  public.admit_card_settings, public.exam_admit_card_settings, public.admit_card_hold,
  public.report_card_setup, public.report_card_setup_exam
  to authenticated;

create policy admit_card_settings_select on public.admit_card_settings for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy admit_card_settings_write on public.admit_card_settings for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_exams')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_exams')) or public.is_super_admin());

create policy exam_admit_card_settings_select on public.exam_admit_card_settings for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy exam_admit_card_settings_write on public.exam_admit_card_settings for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_exams')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_exams')) or public.is_super_admin());

create policy admit_card_hold_select on public.admit_card_hold for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy admit_card_hold_write on public.admit_card_hold for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_exams')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_exams')) or public.is_super_admin());

create policy report_card_setup_select on public.report_card_setup for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy report_card_setup_write on public.report_card_setup for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_exams')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_exams')) or public.is_super_admin());

-- report_card_setup_exam has no school_id of its own -- traversed through report_card_setup, same
-- pattern as exam_subject -> exam.
create policy report_card_setup_exam_select on public.report_card_setup_exam for select to authenticated
  using (exists (select 1 from public.report_card_setup rcs where rcs.id = report_card_setup_exam.setup_id and (rcs.school_id = public.current_school_id() or public.is_super_admin())));
create policy report_card_setup_exam_write on public.report_card_setup_exam for all to authenticated
  using (exists (select 1 from public.report_card_setup rcs where rcs.id = report_card_setup_exam.setup_id and rcs.school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_exams')) or public.is_super_admin())
  with check (exists (select 1 from public.report_card_setup rcs where rcs.id = report_card_setup_exam.setup_id and rcs.school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_exams')) or public.is_super_admin());

-- Weighted aggregate across a setup's component exams, reusing fn_exam_class_results per exam via
-- a lateral join (no re-implementation of the per-exam totals logic). Security invoker (not
-- definer): RLS on exam_subject/mark/enrollment still applies as the calling user, same reasoning
-- as fn_exam_class_results itself. A student only gets a row if they have results in every
-- component exam of the setup (see migration comment above / plan notes) -- no partial-weight
-- fallback, matching how a real term report needs every term's marks.
create or replace function public.fn_report_card_setup_results(p_setup_id uuid, p_class_id uuid)
returns table (student_id uuid, weighted_percentage numeric, exams_counted int)
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
  )
  select per_exam.student_id,
         round(sum(per_exam.percentage * per_exam.weight_percent) / (select w from total_weight), 2),
         count(*)::int
  from per_exam
  group by per_exam.student_id
  having count(*) = (select count(*) from public.report_card_setup_exam where setup_id = p_setup_id);
$$;

grant execute on function public.fn_report_card_setup_results(uuid, uuid) to authenticated;
