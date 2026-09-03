-- P1 Students & Staff, part 2: school-scoped sequential numbering (admission numbers, employee
-- codes). Roll number is intentionally NOT here -- it's a per-enrollment, per-section field a
-- school assigns by roster, not an auto-incrementing sequence (see the student migration).
--
-- A bare `next_value int` column with a read-then-write from application code would hand the
-- same number to two concurrent admissions (classic check-then-act race). `SELECT ... FOR
-- UPDATE` inside a single function makes the second concurrent caller block on the row lock
-- until the first commits, so it sees the already-incremented value -- no duplicates, by
-- construction, not by hoping requests don't overlap. Verified with a genuinely concurrent
-- test (packages/db/tests/numbering-concurrency.test.ts), not a sequential one.
create table public.school_number_sequence (
  school_id uuid not null references public.school(id) on delete cascade,
  sequence_key text not null check (sequence_key in ('student_admission', 'staff_employee_code')),
  prefix text not null default '',
  padding int not null default 4,
  next_value int not null default 1,
  primary key (school_id, sequence_key)
);

alter table public.school_number_sequence enable row level security;

grant select, update on public.school_number_sequence to authenticated;
-- No insert/delete grant to authenticated -- rows are provisioned once per school
-- (migration/seed for now; a school-provisioning flow later). UPDATE is granted because
-- fn_next_school_number is SECURITY INVOKER (see below) and its internal UPDATE is still
-- subject to RLS -- the update policy below is the actual authorization boundary, scoped to
-- the two permissions that legitimately consume a number.

create policy school_number_sequence_select on public.school_number_sequence
  for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());

create policy school_number_sequence_update on public.school_number_sequence
  for update to authenticated
  using (
    (school_id = public.current_school_id()
      and (public.fn_has_permission(public.current_roles(), 'school.manage_students')
           or public.fn_has_permission(public.current_roles(), 'school.manage_staff')))
    or public.is_super_admin()
  )
  with check (
    (school_id = public.current_school_id()
      and (public.fn_has_permission(public.current_roles(), 'school.manage_students')
           or public.fn_has_permission(public.current_roles(), 'school.manage_staff')))
    or public.is_super_admin()
  );

comment on policy school_number_sequence_update on public.school_number_sequence is
  'References school.manage_students / school.manage_staff before either permission row exists
   (those are added in the student/staff migrations that follow this one) -- fn_has_permission
   just returns false for a not-yet-existing key, so this is safe to create first.';

create or replace function public.fn_next_school_number(p_school_id uuid, p_sequence_key text)
returns text
language plpgsql
as $$
declare
  v_next int;
  v_prefix text;
  v_padding int;
begin
  select next_value, prefix, padding
    into v_next, v_prefix, v_padding
    from public.school_number_sequence
    where school_id = p_school_id and sequence_key = p_sequence_key
    for update;

  if not found then
    raise exception 'No number sequence configured for school % / %', p_school_id, p_sequence_key;
  end if;

  update public.school_number_sequence
    set next_value = v_next + 1
    where school_id = p_school_id and sequence_key = p_sequence_key;

  return v_prefix || lpad(v_next::text, v_padding, '0');
end;
$$;

comment on function public.fn_next_school_number(uuid, text) is
  'SECURITY INVOKER on purpose (default) -- callers still need school.manage_students or
   school.manage_staff via the grant below; this function does not bypass authorization, it
   just makes the counter increment atomic. The FOR UPDATE row lock is what prevents two
   concurrent callers from reading the same next_value.';

-- Grant is scoped to the two roles that actually call this (enforced by their own table RLS on
-- student/staff insert, which already requires the matching manage_ permission) -- this
-- function is a narrow, audited exception to "no client UPDATE on school_number_sequence", not
-- a general bypass.
grant execute on function public.fn_next_school_number(uuid, text) to authenticated;
