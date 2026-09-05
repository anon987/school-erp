-- Holiday calendar -- P0 catch-up, not P1 scope creep.
--
-- docs/schoolerp_features.md §A lists "Holiday calendar" as P0 master data, but no table, RLS,
-- or UI for it was ever built (grep for "holiday" across packages/db and apps/web before this
-- migration returns nothing). Attendance (P1, this same work session) has a real, immediate
-- dependency on it: the year-to-date attendance percentage must not penalise a student for days
-- the school was closed, and the marking screen must be able to warn a teacher who's about to
-- mark attendance on a declared non-teaching day. Building the minimum table this requires now is
-- completing an already-committed P0 item this P1 feature needs, not pulling forward new scope --
-- see CLAUDE.md: "If something seems missing from the current phase... say so, don't silently
-- expand scope." This is that "say so": flagged in the Attendance implementation notes, not built
-- silently.
--
-- Deliberately minimal: a flat (school_id, date, name) list, reusing the existing
-- school.manage_master_data permission and the same inline-editable-list UI pattern as
-- department/designation/house (docs/design-system.md > Forms > "Inline-editable tables"). A full
-- academic-calendar builder (recurring rules, per-campus calendars, working-Saturday patterns) is
-- not P1 scope and is not implied by this table.
create table public.holiday (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  date date not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, date)
);

create trigger trg_holiday_set_updated_at
  before update on public.holiday
  for each row execute function public.set_updated_at();

alter table public.holiday enable row level security;

grant select, insert, update, delete on public.holiday to authenticated;

create policy holiday_select on public.holiday for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy holiday_write on public.holiday for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_master_data')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_master_data')) or public.is_super_admin());
