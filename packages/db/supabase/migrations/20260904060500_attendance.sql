-- P1 Attendance (docs/schoolerp_features.md §E): daily class-wise student attendance, staff
-- attendance, a per-school low-attendance threshold, and the percentage aggregate the flagged
-- list and reports read from. Scope explicitly excludes parent alerts (P2, needs messaging),
-- biometric import (P4 -- see CLAUDE.md's biometric_event/attendance_record separation, which is
-- why this table is named attendance_record now, ready for that later reconciliation job to write
-- into rather than something that would need renaming), and period-wise attendance (off by
-- default per spec -- no period_id column added speculatively).

insert into public.permission (key, label) values
  ('attendance.mark_own_class', 'Mark daily attendance for a section one is the class teacher of'),
  ('attendance.manage', 'Mark or correct attendance for any section or staff member, manage the low-attendance threshold');

insert into public.role_permission (role_id, permission_id)
select r.id, p.id from public.role r, public.permission p
where r.key = 'class_teacher' and p.key = 'attendance.mark_own_class';

insert into public.role_permission (role_id, permission_id)
select r.id, p.id from public.role r, public.permission p
where r.key in ('school_owner', 'school_admin', 'principal') and p.key = 'attendance.manage';

-- Single source of truth for "what date is it, for attendance editability purposes" -- shared by
-- the RLS same-day check below and the server action layer (which computes the identical IST
-- date in TypeScript to give a friendly error before RLS would reject it). CLAUDE.md: timestamps
-- are stored UTC, rendered in IST -- attendance_date itself is a plain date with no timezone
-- attached, but "is today" has to be evaluated in the school's local day, not UTC's, or a mark
-- made at 11pm-4am IST would compare against the wrong day.
create or replace function public.fn_today_ist()
returns date
language sql
stable
as $$
  select (now() at time zone 'Asia/Kolkata')::date
$$;

-- One row per (student, day). Daily-only for P1 -- see migration header. class_id/section_id are
-- captured at marking time from the student's enrollment as of that day, the same snapshot
-- discipline fn_commit_student_import_rows uses for enrollment itself: a student transferred
-- from 9-A to 9-B mid-year keeps their pre-transfer rows pointing at 9-A (correct history for
-- 9-A's reports) and their post-transfer rows pointing at 9-B, with no retroactive rewrite. The
-- (school_id, student_id, attendance_date) unique constraint is deliberately NOT section-scoped:
-- a student has exactly one attendance status per day regardless of which section marks them,
-- which is what prevents a same-day transfer from producing two conflicting rows for one day (see
-- fn_mark_section_attendance below for how a same-day double-mark from the OLD section is rejected
-- rather than silently overwritten once the NEW section has already marked that day).
create table public.attendance_record (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  student_id uuid not null references public.student(id) on delete cascade,
  academic_year_id uuid not null references public.academic_year(id) on delete cascade,
  class_id uuid not null references public.class(id) on delete cascade,
  section_id uuid not null references public.section(id) on delete cascade,
  attendance_date date not null,
  status text not null check (status in ('present', 'absent', 'late', 'half_day', 'leave')),
  remarks text,
  -- auth_user_id, not staff_id: the actor marking attendance (school_owner, school_admin,
  -- principal, or a class_teacher) is not guaranteed to have a `staff` HR record -- an owner-only
  -- login in particular commonly doesn't (see seed.sql/pilot_school_setup.sql, neither creates a
  -- staff row for the owner they create). audit_log.actor_auth_user_id and
  -- import_batch.uploaded_by_auth_user_id use the same identity for the same reason; this follows
  -- that existing convention rather than introducing a new "who did this" shape.
  marked_by_auth_user_id uuid not null references auth.users(id),
  marked_at timestamptz not null default now(),
  updated_by_auth_user_id uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  unique (school_id, student_id, attendance_date)
);

create index attendance_record_school_section_date_idx
  on public.attendance_record (school_id, section_id, attendance_date);
-- Supports fn_attendance_percentages' per-student aggregate and the student-wise report.
create index attendance_record_school_student_date_idx
  on public.attendance_record (school_id, student_id, attendance_date);

create trigger trg_attendance_record_set_updated_at
  before update on public.attendance_record
  for each row execute function public.set_updated_at();

alter table public.attendance_record enable row level security;

-- Staff attendance: admin/HR roll-call model (confirmed with the school -- no self-check-in in
-- P1, since that would require all ~60 pilot staff to have working logins before
-- /settings/members ships, which is itself a separate blocked P1 ticket). One row per
-- (staff, day); no section/class dimension.
create table public.staff_attendance_record (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  attendance_date date not null,
  status text not null check (status in ('present', 'absent', 'late', 'half_day', 'leave')),
  remarks text,
  marked_by_auth_user_id uuid not null references auth.users(id),
  marked_at timestamptz not null default now(),
  unique (school_id, staff_id, attendance_date)
);

create index staff_attendance_record_school_date_idx
  on public.staff_attendance_record (school_id, attendance_date);

alter table public.staff_attendance_record enable row level security;

-- One threshold per school (confirmed scope -- not per-class). 75% is a placeholder default, not
-- a hard-coded rule: every school overrides it during Stage 3 configuration
-- (docs/schoolerp_launchplan.md §4).
create table public.attendance_threshold_setting (
  school_id uuid primary key references public.school(id) on delete cascade,
  threshold_percent numeric(5, 2) not null default 75.00 check (threshold_percent between 0 and 100),
  updated_at timestamptz not null default now()
);

create trigger trg_attendance_threshold_setting_set_updated_at
  before update on public.attendance_threshold_setting
  for each row execute function public.set_updated_at();

alter table public.attendance_threshold_setting enable row level security;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on
  public.attendance_record, public.staff_attendance_record, public.attendance_threshold_setting
  to authenticated;

-- Select stays broad-read (same rationale nav.tsx gives for Students/Staff directories): anyone
-- in the school can see attendance history; marking/correcting is what's gated.
create policy attendance_record_select on public.attendance_record for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());

-- Write is: attendance.manage (any section, any day), OR the section's own class teacher but ONLY
-- for today (Asia/Kolkata) -- a class teacher correcting "marked absent, actually showed up late"
-- same-day needs no escalation; a change to a PAST day's record always requires attendance.manage,
-- so a register that already fed a report card can't be quietly edited by whoever marked it
-- weeks ago. Every write (same-day self-correction or admin historical edit) still gets its own
-- audit_log row from the server action layer -- this policy is the backstop, not the audit trail.
create policy attendance_record_write on public.attendance_record for all to authenticated
  using (
    school_id = public.current_school_id() and (
      public.fn_has_permission(public.current_roles(), 'attendance.manage')
      or (
        attendance_date = public.fn_today_ist()
        and exists (
          select 1 from public.section sec
          join public.staff st on st.id = sec.class_teacher_staff_id
          join public.school_member sm on sm.id = st.school_member_id
          where sec.id = attendance_record.section_id and sm.auth_user_id = auth.uid()
        )
      )
    ) or public.is_super_admin()
  )
  with check (
    school_id = public.current_school_id() and (
      public.fn_has_permission(public.current_roles(), 'attendance.manage')
      or (
        attendance_date = public.fn_today_ist()
        and exists (
          select 1 from public.section sec
          join public.staff st on st.id = sec.class_teacher_staff_id
          join public.school_member sm on sm.id = st.school_member_id
          where sec.id = attendance_record.section_id and sm.auth_user_id = auth.uid()
        )
      )
    ) or public.is_super_admin()
  );

create policy staff_attendance_record_select on public.staff_attendance_record for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy staff_attendance_record_write on public.staff_attendance_record for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'attendance.manage')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'attendance.manage')) or public.is_super_admin());

create policy attendance_threshold_setting_select on public.attendance_threshold_setting for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy attendance_threshold_setting_write on public.attendance_threshold_setting for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'attendance.manage')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'attendance.manage')) or public.is_super_admin());

-- Batch mark/correct a whole section's roster in one round trip, not one upsert per student.
-- Runs as the caller (no SECURITY DEFINER), so attendance_record_write's RLS policy still applies
-- to every row this touches -- an unauthorized attempt still fails via RLS, this function doesn't
-- widen access, it only batches it.
--
-- The ON CONFLICT ... WHERE clause is the mid-year-transfer safeguard: attendance_record's unique
-- constraint is (school_id, student_id, attendance_date) with no section_id, deliberately, so a
-- student who transferred sections still has exactly one row per day. If student S already has a
-- row for today under their OLD section (marked before the transfer) and this call is submitting
-- from the NEW section's roster, the WHERE clause (matching section_id) makes that row a no-op
-- for S rather than silently overwriting the old section's mark with the new one -- S comes back
-- in `skipped_other_section` so the caller can surface "already marked in <other section> today"
-- instead of losing data invisibly.
create or replace function public.fn_mark_section_attendance(
  p_school_id uuid,
  p_section_id uuid,
  p_class_id uuid,
  p_academic_year_id uuid,
  p_attendance_date date,
  p_marked_by_auth_user_id uuid,
  p_marks jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_mark jsonb;
  v_student_id uuid;
  v_status text;
  v_remarks text;
  v_conflicts uuid[] := '{}';
  v_written int := 0;
begin
  for v_mark in select * from jsonb_array_elements(p_marks) loop
    v_student_id := (v_mark->>'student_id')::uuid;
    v_status := v_mark->>'status';
    v_remarks := nullif(v_mark->>'remarks', '');

    insert into public.attendance_record (
      school_id, student_id, academic_year_id, class_id, section_id, attendance_date,
      status, remarks, marked_by_auth_user_id
    ) values (
      p_school_id, v_student_id, p_academic_year_id, p_class_id, p_section_id, p_attendance_date,
      v_status, v_remarks, p_marked_by_auth_user_id
    )
    on conflict (school_id, student_id, attendance_date) do update
      set status = excluded.status,
          remarks = excluded.remarks,
          updated_by_auth_user_id = p_marked_by_auth_user_id,
          updated_at = now()
      where attendance_record.section_id = excluded.section_id;

    if found then
      v_written := v_written + 1;
    else
      v_conflicts := array_append(v_conflicts, v_student_id);
    end if;
  end loop;

  return jsonb_build_object('written', v_written, 'skipped_other_section', to_jsonb(v_conflicts));
end;
$$;

grant execute on function public.fn_mark_section_attendance(uuid, uuid, uuid, uuid, date, uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Percentage aggregate -- server-side, set-oriented, one row per student. Never fetch every
-- attendance_record row into app memory and sum in JS for this: the same class of bug that
-- undercounted the dashboard (see getDashboardOverview's fix) would silently miscompute
-- percentages for a 2,000+ student school once any one student's row count crossed PostgREST's
-- default max-rows on a naive per-student fetch loop.
--
-- Denominator = days actually recorded for that student (count of their own attendance_record
-- rows), not calendar days elapsed since the academic year started -- a day the section simply
-- wasn't marked (holiday, teacher absent, technical issue) must not count against the student.
-- 'leave' rows are excluded from both numerator and denominator (confirmed rule: sanctioned leave
-- doesn't hurt the percentage). Declared holidays are excluded defensively even if a stray
-- attendance_record exists for that date (the marking screen warns before that can happen, but
-- the aggregate doesn't rely on the UI alone to keep history clean).
--
-- 'late' counts as present-equivalent (1.0) for the percentage -- the student was physically at
-- school; lateness is a separate signal from absence. This wasn't one of the four decisions
-- confirmed up front and is a judgment call, not a spec requirement -- flagged in the
-- implementation notes for review.
create or replace function public.fn_attendance_percentages(p_school_id uuid, p_academic_year_id uuid)
returns table(student_id uuid, days_marked int, effective_present numeric, percent numeric)
language sql
stable
as $$
  select
    ar.student_id,
    count(*)::int as days_marked,
    sum(case ar.status
          when 'present' then 1
          when 'late' then 1
          when 'half_day' then 0.5
          else 0
        end) as effective_present,
    round(
      100.0 * sum(case ar.status when 'present' then 1 when 'late' then 1 when 'half_day' then 0.5 else 0 end)
      / count(*),
      2
    ) as percent
  from public.attendance_record ar
  where ar.school_id = p_school_id
    and ar.academic_year_id = p_academic_year_id
    and ar.status <> 'leave'
    and not exists (
      select 1 from public.holiday h where h.school_id = ar.school_id and h.date = ar.attendance_date
    )
  group by ar.student_id;
$$;

grant execute on function public.fn_attendance_percentages(uuid, uuid) to authenticated;
grant execute on function public.fn_today_ist() to authenticated;
