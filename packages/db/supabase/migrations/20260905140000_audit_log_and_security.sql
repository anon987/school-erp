-- Audit log viewer (docs/schoolerp_features.md §U) -- the audit_log table and
-- school.view_audit_log permission already exist from P0 (49 call sites already write to it);
-- this migration is the read path for a UI, plus login history and a password/session policy
-- placeholder.
--
-- fn_get_audit_log resolves actor_auth_user_id to a display name via user_profile, which is
-- normally only cross-user-readable by someone with school.manage_members (see that table's own
-- RLS comment). `principal` has school.view_audit_log but NOT school.manage_members -- a plain
-- join from the app would silently show blank actor names for that role. Fixed correctly with a
-- security definer function that does its OWN permission + tenant check before reading anything
-- (not by loosening user_profile's RLS, which would let a viewer browse arbitrary staff profiles
-- outside the audit-log context -- a much bigger grant than "show me who did this").
create or replace function public.fn_get_audit_log(
  p_school_id uuid,
  p_action_filter text default null,
  p_from_date timestamptz default null,
  p_to_date timestamptz default null,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  action text,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz,
  actor_display_name text,
  actor_email text,
  total_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_school_id is distinct from public.current_school_id() and not public.is_super_admin() then
    raise exception 'Forbidden';
  end if;
  if not (public.fn_has_permission(public.current_roles(), 'school.view_audit_log') or public.is_super_admin()) then
    raise exception 'Forbidden';
  end if;

  return query
  select
    al.id, al.action, al.entity_type, al.entity_id, al.metadata, al.created_at,
    up.display_name, up.email,
    count(*) over()::bigint as total_count
  from public.audit_log al
  left join public.user_profile up on up.auth_user_id = al.actor_auth_user_id
  where al.school_id = p_school_id
    and (p_action_filter is null or al.action ilike '%' || p_action_filter || '%')
    and (p_from_date is null or al.created_at >= p_from_date)
    and (p_to_date is null or al.created_at <= p_to_date)
  order by al.created_at desc
  limit p_limit offset p_offset;
end;
$$;

grant execute on function public.fn_get_audit_log(uuid, text, timestamptz, timestamptz, int, int) to authenticated;

-- Login history -- successful sign-ins only for this pass. Failed-attempt tracking (useful for
-- brute-force detection) needs either a service-role write path from apps/worker or a
-- rate-limited edge function -- a real, separate piece of work, not something to bolt on here
-- under this ticket's "small scope" framing. Flagged explicitly rather than silently shipped
-- half-built.
create table public.login_history (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  school_id uuid references public.school(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.login_history enable row level security;

grant select, insert on public.login_history to authenticated;

-- Base RLS is self-only (least privilege) -- cross-user visibility for admins/principals goes
-- through fn_get_login_history below, same reasoning as the audit log above.
create policy login_history_insert on public.login_history for insert to authenticated
  with check (auth_user_id = auth.uid());

create policy login_history_select on public.login_history for select to authenticated
  using (auth_user_id = auth.uid() or public.is_super_admin());

create or replace function public.fn_get_login_history(p_school_id uuid, p_limit int default 50, p_offset int default 0)
returns table (id uuid, auth_user_id uuid, display_name text, email text, created_at timestamptz, total_count bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_school_id is distinct from public.current_school_id() and not public.is_super_admin() then
    raise exception 'Forbidden';
  end if;
  if not (public.fn_has_permission(public.current_roles(), 'school.view_audit_log') or public.is_super_admin()) then
    raise exception 'Forbidden';
  end if;

  return query
  select lh.id, lh.auth_user_id, up.display_name, up.email, lh.created_at, count(*) over()::bigint as total_count
  from public.login_history lh
  left join public.user_profile up on up.auth_user_id = lh.auth_user_id
  where lh.school_id = p_school_id
  order by lh.created_at desc
  limit p_limit offset p_offset;
end;
$$;

grant execute on function public.fn_get_login_history(uuid, int, int) to authenticated;

-- Password policy / session expiry -- stored and shown in Settings, but NOT enforced anywhere
-- yet: there is no password-set/invite/change flow anywhere in this codebase to enforce
-- min_password_length against, and per-school JWT expiry would need custom session-validation
-- middleware (Supabase Auth's session lifetime is a project-wide setting, not per-tenant).
-- Flagged explicitly rather than implying either is active. Gated by school.manage_members, not
-- view_audit_log -- this is account-security configuration, not an audit read.
create table public.school_security_policy (
  school_id uuid primary key references public.school(id) on delete cascade,
  min_password_length int not null default 8 check (min_password_length >= 6),
  session_expiry_minutes int check (session_expiry_minutes is null or session_expiry_minutes >= 15),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_school_security_policy_set_updated_at
  before update on public.school_security_policy
  for each row execute function public.set_updated_at();

alter table public.school_security_policy enable row level security;

grant select, insert, update, delete on public.school_security_policy to authenticated;

create policy school_security_policy_select on public.school_security_policy for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());

create policy school_security_policy_write on public.school_security_policy for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_members')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_members')) or public.is_super_admin());
