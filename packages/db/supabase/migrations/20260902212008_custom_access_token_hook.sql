-- Stamps school_id + roles[] onto every access token at issuance, per
-- docs/schoolerp_techstack.md §2.2. This is what makes current_school_id()/current_roles()
-- (previous migration) meaningful -- without this hook the JWT carries no tenant claim at all.
--
-- P0 looks up the caller's single active school_member row (oldest first, since P0 enforces
-- "one active membership per identity" at the application layer -- see
-- 20260902212005_identity_and_roles.sql). A platform admin gets the 'super_admin' role with no
-- school_id claim, consistent with "platform admins don't belong to a school."
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  v_auth_user_id uuid;
  v_is_admin boolean;
  v_member_id uuid;
  v_school_id uuid;
  v_roles text[] := array[]::text[];
begin
  v_auth_user_id := (event ->> 'user_id')::uuid;
  claims := coalesce(event -> 'claims', '{}'::jsonb);

  select exists (
    select 1 from public.platform_admin pa where pa.auth_user_id = v_auth_user_id
  ) into v_is_admin;

  if v_is_admin then
    v_roles := v_roles || 'super_admin';
  end if;

  select sm.id, sm.school_id
    into v_member_id, v_school_id
    from public.school_member sm
    where sm.auth_user_id = v_auth_user_id
      and sm.is_active
    order by sm.created_at asc
    limit 1;

  if found then
    select v_roles || coalesce(array_agg(r.key), array[]::text[])
      into v_roles
      from public.school_member_role smr
      join public.role r on r.id = smr.role_id
      where smr.school_member_id = v_member_id;

    claims := jsonb_set(claims, '{school_id}', to_jsonb(v_school_id::text));
  end if;

  claims := jsonb_set(claims, '{roles}', to_jsonb(v_roles));
  event := jsonb_set(event, '{claims}', claims);

  return event;
end;
$$;

comment on function public.custom_access_token_hook(jsonb) is
  'Registered in supabase/config.toml [auth.hook.custom_access_token]. Called by the Auth
   service, not by application code -- see grants below for why it is locked to
   supabase_auth_admin.';

-- Per Supabase's documented pattern: only the Auth service's own role may invoke the hook or
-- read the tables it consults. Ordinary authenticated/anon roles get neither -- this function
-- decides what goes IN a JWT, so it must not be client-callable, and it must not depend on the
-- RLS policies meant for end users (supabase_auth_admin gets its own narrow policies instead
-- of bypassing RLS wholesale).
revoke execute on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;

grant usage on schema public to supabase_auth_admin;
grant select on public.platform_admin to supabase_auth_admin;
grant select on public.school_member to supabase_auth_admin;
grant select on public.school_member_role to supabase_auth_admin;
grant select on public.role to supabase_auth_admin;

create policy platform_admin_auth_hook_read on public.platform_admin
  for select to supabase_auth_admin
  using (true);

create policy school_member_auth_hook_read on public.school_member
  for select to supabase_auth_admin
  using (true);

create policy school_member_role_auth_hook_read on public.school_member_role
  for select to supabase_auth_admin
  using (true);

create policy role_auth_hook_read on public.role
  for select to supabase_auth_admin
  using (true);
