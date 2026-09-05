-- P2 Timetable (docs/schoolerp_features.md §I): class timetable builder, teacher view, room/
-- teacher conflict detection, substitution handling, print/mobile views. Parent-portal read
-- reuses the fn_is_portal_member_of_school helper from the P2 Parent Portal migration.
--
-- Deliberately reuses `staff_class_subject` (P1, packages/db staff migration) rather than
-- re-picking "which teacher teaches this subject" per timetable slot -- that assignment already
-- exists (one teacher per class/section/subject/year, enforced by
-- staff_class_subject_one_teacher_per_slot's unique constraint) and a timetable slot claiming a
-- DIFFERENT teacher for that subject would just be wrong data, not a legitimate override.

insert into public.permission (key, label) values
  ('school.manage_timetable', 'Build and edit class timetables, assign substitutions');

insert into public.role_permission (role_id, permission_id)
select r.id, p.id from public.role r, public.permission p
where r.key in ('school_owner', 'school_admin', 'principal') and p.key = 'school.manage_timetable';

-- ---------------------------------------------------------------------------
-- Period timings are configurable per school (a school's period 1 might be 8:00-8:40 or
-- 9:15-10:00) -- same bare-master-data shape as admission_stage/grade_band, with start/end times
-- instead of a stage_type.
create table public.period (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  period_number int not null,
  label text not null,
  start_time time not null,
  end_time time not null,
  is_break boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, period_number),
  check (end_time > start_time)
);

create trigger trg_period_set_updated_at before update on public.period for each row execute function public.set_updated_at();
alter table public.period enable row level security;

grant select, insert, update, delete on public.period to authenticated;

create policy period_select on public.period for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy period_write on public.period for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_master_data')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_master_data')) or public.is_super_admin());
create policy period_select_parent on public.period for select to authenticated
  using (public.fn_is_portal_member_of_school(school_id));

-- ---------------------------------------------------------------------------
-- One row per (section, day, period). class_id/section_id/subject_id/staff_id/academic_year_id
-- are denormalized FROM staff_class_subject_id by the trigger below, not independently supplied
-- -- this is what makes the two conflict-detection unique indexes possible without a join, and
-- guarantees a slot can never claim a teacher/subject pairing that staff_class_subject doesn't
-- actually have on record.
create table public.timetable_slot (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  staff_class_subject_id uuid not null references public.staff_class_subject(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  period_id uuid not null references public.period(id) on delete cascade,
  room text,
  academic_year_id uuid not null references public.academic_year(id) on delete cascade,
  class_id uuid not null references public.class(id) on delete cascade,
  section_id uuid not null references public.section(id) on delete cascade,
  subject_id uuid not null references public.subject(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, class_id, section_id, day_of_week, period_id)
);

create or replace function public.fn_timetable_slot_denormalize()
returns trigger
language plpgsql
as $$
declare
  v_scs record;
begin
  select academic_year_id, class_id, section_id, subject_id, staff_id
    into v_scs
    from public.staff_class_subject
    where id = new.staff_class_subject_id and school_id = new.school_id;
  if not found then
    raise exception 'staff_class_subject % not found in school %', new.staff_class_subject_id, new.school_id;
  end if;

  new.academic_year_id := v_scs.academic_year_id;
  new.class_id := v_scs.class_id;
  new.section_id := v_scs.section_id;
  new.subject_id := v_scs.subject_id;
  new.staff_id := v_scs.staff_id;
  return new;
end;
$$;

create trigger trg_timetable_slot_denormalize
  before insert or update on public.timetable_slot
  for each row execute function public.fn_timetable_slot_denormalize();

create trigger trg_timetable_slot_set_updated_at before update on public.timetable_slot for each row execute function public.set_updated_at();

-- "Room and teacher conflict detection" (§I), enforced as a hard DB constraint, not just a
-- friendly UI warning that a race condition could still slip past: no teacher, and no room, can
-- be double-booked in the same school at the same day+period.
create unique index timetable_slot_no_teacher_double_book on public.timetable_slot (school_id, day_of_week, period_id, staff_id);
create unique index timetable_slot_no_room_double_book on public.timetable_slot (school_id, day_of_week, period_id, room) where room is not null;

alter table public.timetable_slot enable row level security;

grant select, insert, update, delete on public.timetable_slot to authenticated;

create policy timetable_slot_select on public.timetable_slot for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy timetable_slot_write on public.timetable_slot for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_timetable')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_timetable')) or public.is_super_admin());
create policy timetable_slot_select_parent on public.timetable_slot for select to authenticated
  using (public.fn_is_portal_member_of_school(school_id));

-- ---------------------------------------------------------------------------
-- Day-specific substitution for one timetable slot -- a permanent timetable change is just
-- editing timetable_slot itself; this table is only for "today, this one period, a different
-- teacher covers" (§I "Substitution handling for absent teachers"). original_staff_id is a
-- snapshot of timetable_slot.staff_id at the moment the substitution was created (via the
-- trigger below), not a live join -- if the base timetable assignment changes later, a past
-- substitution record should still say who it originally replaced.
create table public.substitution (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  timetable_slot_id uuid not null references public.timetable_slot(id) on delete cascade,
  substitution_date date not null,
  original_staff_id uuid not null references public.staff(id),
  substitute_staff_id uuid not null references public.staff(id) on delete cascade,
  reason text,
  created_by_auth_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (timetable_slot_id, substitution_date),
  check (substitute_staff_id <> original_staff_id)
);

create or replace function public.fn_substitution_snapshot_original_staff()
returns trigger
language plpgsql
as $$
begin
  select staff_id into new.original_staff_id from public.timetable_slot where id = new.timetable_slot_id and school_id = new.school_id;
  if new.original_staff_id is null then
    raise exception 'timetable_slot % not found in school %', new.timetable_slot_id, new.school_id;
  end if;
  return new;
end;
$$;

create trigger trg_substitution_snapshot_original_staff
  before insert on public.substitution
  for each row execute function public.fn_substitution_snapshot_original_staff();

alter table public.substitution enable row level security;

grant select, insert, delete on public.substitution to authenticated;

create policy substitution_select on public.substitution for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy substitution_insert on public.substitution for insert to authenticated
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_timetable')) or public.is_super_admin());
create policy substitution_delete on public.substitution for delete to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_timetable')) or public.is_super_admin());
create policy substitution_select_parent on public.substitution for select to authenticated
  using (public.fn_is_portal_member_of_school(school_id));
