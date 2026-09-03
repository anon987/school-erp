-- School isolation layer, part 3: JWT-reading helpers, the single permission source of truth,
-- and the RLS policy applied to every table above.
--
-- docs/schoolerp_techstack.md §2.2 pattern is a raw `auth.jwt() ->> 'school_id'` repeated in
-- every policy. That is one expression to get right and eighteen places to get wrong once
-- feature-module tables start arriving in P1. These helpers are the one place; every policy
-- calls them instead of touching auth.jwt() directly.

create or replace function public.current_school_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'school_id', '')::uuid
$$;

comment on function public.current_school_id() is
  'The single school_id stamped into the caller''s JWT by custom_access_token_hook. Null for
   platform admins with no active school_member row. Every school-scoped RLS policy compares
   its table''s school_id to this -- never to auth.jwt() directly.';

create or replace function public.current_roles()
returns text[]
language sql
stable
as $$
  select coalesce(
    array(select jsonb_array_elements_text(auth.jwt() -> 'roles')),
    array[]::text[]
  )
$$;

comment on function public.current_roles() is
  'The caller''s role keys for their current school_member, as stamped by
   custom_access_token_hook, plus ''super_admin'' if they are a platform admin. An array
   because school_member_role is a genuine many-to-many -- a person can hold Principal and
   Class Teacher at once.';

create or replace function public.is_super_admin()
returns boolean
language sql
stable
as $$
  select 'super_admin' = any(public.current_roles())
$$;

-- The single source of truth for "can this role do this thing." Reads role_permission
-- directly. Both RLS policies (via fn_has_permission below) and the server-side TypeScript
-- permission helper (which calls this same function over RPC, see
-- apps/web/src/lib/auth/permissions.ts) resolve permissions here and nowhere else -- so the UI
-- and the database can never disagree about what a role is allowed to do.
create or replace function public.fn_role_permissions(role_keys text[])
returns table (permission_key text)
language sql
stable
as $$
  select distinct p.key
  from public.role_permission rp
  join public.role r on r.id = rp.role_id
  join public.permission p on p.id = rp.permission_id
  where r.key = any(role_keys)
$$;

create or replace function public.fn_has_permission(role_keys text[], perm_key text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.fn_role_permissions(role_keys) rp
    where rp.permission_key = perm_key
  )
$$;

comment on function public.fn_has_permission(text[], text) is
  'RPC-callable. RLS policies call this with current_roles(); apps/web calls it the same way
   over supabase.rpc(''fn_has_permission'', ...) so a permission check is identical in both
   layers.';

grant execute on function public.current_school_id() to authenticated, anon;
grant execute on function public.current_roles() to authenticated, anon;
grant execute on function public.is_super_admin() to authenticated, anon;
grant execute on function public.fn_role_permissions(text[]) to authenticated;
grant execute on function public.fn_has_permission(text[], text) to authenticated;

-- Reference/taxonomy tables: readable by any authenticated caller, writable only via
-- migrations (service_role bypasses RLS entirely, which is how seed/admin tooling manages
-- them). No school_id -- these are platform-wide, not tenant data.
grant select on public.role, public.permission, public.role_permission to authenticated;

create policy role_read on public.role for select to authenticated using (true);
create policy permission_read on public.permission for select to authenticated using (true);
create policy role_permission_read on public.role_permission for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- school
-- ---------------------------------------------------------------------------
-- The one table not filtered by "school_id = current_school_id()", because it IS the
-- school_id's referent. A caller may see the school they currently belong to, or every school
-- if they're a platform admin.
grant select, update on public.school to authenticated;
grant insert, delete on public.school to authenticated;

create policy school_select on public.school
  for select to authenticated
  using (id = public.current_school_id() or public.is_super_admin());

create policy school_insert on public.school
  for insert to authenticated
  with check (public.is_super_admin());

create policy school_update on public.school
  for update to authenticated
  using (
    (id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_profile'))
    or public.is_super_admin()
  );

create policy school_delete on public.school
  for delete to authenticated
  using (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- campus
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.campus to authenticated;

create policy campus_select on public.campus
  for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());

create policy campus_write on public.campus
  for all to authenticated
  using (
    (school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_profile'))
    or public.is_super_admin()
  )
  with check (
    (school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_profile'))
    or public.is_super_admin()
  );

-- ---------------------------------------------------------------------------
-- school_branding
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.school_branding to authenticated;

create policy school_branding_select on public.school_branding
  for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());

create policy school_branding_write on public.school_branding
  for all to authenticated
  using (
    (school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_branding'))
    or public.is_super_admin()
  )
  with check (
    (school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_branding'))
    or public.is_super_admin()
  );

-- ---------------------------------------------------------------------------
-- school_module_flag
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.school_module_flag to authenticated;

create policy school_module_flag_select on public.school_module_flag
  for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());

create policy school_module_flag_write on public.school_module_flag
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

comment on policy school_module_flag_write on public.school_module_flag is
  'Module enablement is a platform commercial decision (plan/billing), not a school
   self-service setting for P0 -- only platform admins toggle it.';

-- ---------------------------------------------------------------------------
-- user_profile (global identity -- not school-scoped)
-- ---------------------------------------------------------------------------
grant select, insert, update on public.user_profile to authenticated;

create policy user_profile_select on public.user_profile
  for select to authenticated
  using (
    auth_user_id = auth.uid()
    or public.is_super_admin()
    or exists (
      select 1 from public.school_member sm
      where sm.auth_user_id = user_profile.auth_user_id
        and sm.school_id = public.current_school_id()
        and public.fn_has_permission(public.current_roles(), 'school.manage_members')
    )
  );

create policy user_profile_insert on public.user_profile
  for insert to authenticated
  with check (auth_user_id = auth.uid());

create policy user_profile_update on public.user_profile
  for update to authenticated
  using (auth_user_id = auth.uid() or public.is_super_admin())
  with check (auth_user_id = auth.uid() or public.is_super_admin());

comment on policy user_profile_select on public.user_profile is
  'Self-access always allowed (global identity). A school_admin-type role with
   school.manage_members may also see profiles of people who are members of their current
   school -- this is the one cross-cutting read, and it is permission-gated, not a blanket
   "same school" filter, because user_profile has no school_id of its own.';

-- ---------------------------------------------------------------------------
-- platform_admin
-- ---------------------------------------------------------------------------
grant select on public.platform_admin to authenticated;

create policy platform_admin_select on public.platform_admin
  for select to authenticated
  using (auth_user_id = auth.uid() or public.is_super_admin());

comment on table public.platform_admin is
  'No insert/update/delete policy for any authenticated role -- granting platform-admin status
   is a service_role-only operation (migration or an explicitly audited admin tool), never a
   client-reachable mutation.';

-- ---------------------------------------------------------------------------
-- school_member
-- ---------------------------------------------------------------------------
grant select, insert, update on public.school_member to authenticated;

create policy school_member_select on public.school_member
  for select to authenticated
  using (
    auth_user_id = auth.uid()
    or school_id = public.current_school_id()
    or public.is_super_admin()
  );

create policy school_member_insert on public.school_member
  for insert to authenticated
  with check (
    (school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_members'))
    or public.is_super_admin()
  );

create policy school_member_update on public.school_member
  for update to authenticated
  using (
    (school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_members'))
    or public.is_super_admin()
  )
  with check (
    (school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_members'))
    or public.is_super_admin()
  );

comment on table public.school_member is
  'No delete policy: memberships are deactivated (is_active = false), never deleted, so
   audit_log entries referencing a membership''s history stay meaningful.';

-- ---------------------------------------------------------------------------
-- school_member_role
-- ---------------------------------------------------------------------------
grant select, insert, delete on public.school_member_role to authenticated;

create policy school_member_role_select on public.school_member_role
  for select to authenticated
  using (
    exists (
      select 1 from public.school_member sm
      where sm.id = school_member_role.school_member_id
        and (sm.school_id = public.current_school_id() or sm.auth_user_id = auth.uid())
    )
    or public.is_super_admin()
  );

create policy school_member_role_write on public.school_member_role
  for all to authenticated
  using (
    exists (
      select 1 from public.school_member sm
      where sm.id = school_member_role.school_member_id
        and sm.school_id = public.current_school_id()
        and public.fn_has_permission(public.current_roles(), 'school.manage_members')
    )
    or public.is_super_admin()
  )
  with check (
    exists (
      select 1 from public.school_member sm
      where sm.id = school_member_role.school_member_id
        and sm.school_id = public.current_school_id()
        and public.fn_has_permission(public.current_roles(), 'school.manage_members')
    )
    or public.is_super_admin()
  );

comment on table public.school_member_role is
  'No update policy -- a role is granted or revoked (insert/delete), never edited in place.
   Every grant/revoke here should be followed by revokeSchoolMemberSessions for that member''s
   auth_user_id (packages/integrations/auth) so a privilege change is not delayed by the JWT
   TTL -- see fn_has_permission for how the change reaches Postgres, and
   custom_access_token_hook for how it reaches the JWT on next issuance.';

-- ---------------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------------
-- Insert + select only. No update or delete policy exists for any role, at any permission
-- level -- immutability here comes from the absence of a policy, not a rule to remember.
grant select, insert on public.audit_log to authenticated;

create policy audit_log_select on public.audit_log
  for select to authenticated
  using (
    (school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.view_audit_log'))
    or public.is_super_admin()
  );

create policy audit_log_insert on public.audit_log
  for insert to authenticated
  with check (
    school_id = public.current_school_id()
    or (school_id is null and public.is_super_admin())
  );
