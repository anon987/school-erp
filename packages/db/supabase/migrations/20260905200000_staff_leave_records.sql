-- Staff leave records (docs/schoolerp_features.md §D, P1). Scoped as a simple log + history, not
-- a self-service leave-application portal (that's Parent/Staff Portal territory, P2+) -- whoever
-- has school.manage_staff logs a leave, and that logging IS the approval (same "the person
-- entering it has the authority" pattern as marks entry and fines elsewhere in this app), not a
-- separate pending-then-approve queue. `status` still exists (not collapsed away) so a future
-- self-service flow can set 'pending' without a schema change.
create table public.leave_type (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  name text not null,
  is_paid boolean not null default true,
  created_at timestamptz not null default now(),
  unique (school_id, name)
);

alter table public.leave_type enable row level security;

create table public.leave_request (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  leave_type_id uuid not null references public.leave_type(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  reason text,
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  applied_by_auth_user_id uuid references auth.users(id),
  decided_by_auth_user_id uuid references auth.users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

alter table public.leave_request enable row level security;

grant select, insert, update, delete on public.leave_type, public.leave_request to authenticated;

create policy leave_type_select on public.leave_type for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy leave_type_write on public.leave_type for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_staff')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_staff')) or public.is_super_admin());

create policy leave_request_select on public.leave_request for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy leave_request_write on public.leave_request for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_staff')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_staff')) or public.is_super_admin());
