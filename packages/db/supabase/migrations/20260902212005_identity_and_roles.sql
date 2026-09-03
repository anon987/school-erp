-- School isolation layer, part 2: identity, membership, and roles.
--
-- Identity is separated from membership deliberately. `auth.users` (Supabase-managed) is a
-- GLOBAL identity: one email, and eventually one phone number, per person, project-wide. A
-- teacher at one school whose child studies at another, or who teaches at two institutions
-- (common among Indian inter colleges), is a real case in this client base. If identity were
-- stamped with a single school_id, that person could never be represented twice with the same
-- login. `school_member` is the join: which school(s) a given identity belongs to, and with
-- which roles.
--
-- For P0 the product enforces exactly one active membership per identity at the application
-- layer (no school switcher is built), and the JWT carries a single school_id. The schema does
-- not enforce that limit -- there is no unique constraint on auth_user_id alone, only on
-- (auth_user_id, school_id) -- so a second membership does not require a migration later.

-- Global identity profile, one row per auth.users row. Phone is first-class from day one even
-- though P0 login is email/password: the eventual auth method for parents and very likely
-- staff is phone + OTP (most clerks/teachers/parents in this client base don't have an email
-- address they check), and collecting it late would mean back-filling 2,200+ records instead
-- of asking once at account creation.
create table public.user_profile (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  phone text not null,
  display_name text not null,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profile_phone_e164 check (phone ~ '^\+[1-9][0-9]{7,14}$')
);

comment on column public.user_profile.phone is
  'E.164 format, e.g. +919415012345. Globally unique: a phone number identifies one person
   project-wide, not one person per school.';
comment on column public.user_profile.email is
  'Nullable and not the display identity -- display_name is authoritative. Email is a P0 login
   convenience for staff who have one; many end users (parents, several staff) will not.';

create unique index user_profile_phone_key on public.user_profile (phone);

create trigger trg_user_profile_set_updated_at
  before update on public.user_profile
  for each row execute function public.set_updated_at();

alter table public.user_profile enable row level security;

-- Platform-defined role taxonomy (docs/schoolerp_features.md §1.2). Roles are a fixed product
-- taxonomy, not school-customisable, for P0 -- schools configure *who holds* a role, not what
-- roles exist.
create table public.role (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  phase text not null,
  created_at timestamptz not null default now()
);

comment on table public.role is
  'Fixed platform role taxonomy from docs/schoolerp_features.md §1.2. Not school-editable.';

alter table public.role enable row level security;

create table public.permission (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  created_at timestamptz not null default now()
);

alter table public.permission enable row level security;

-- The single source of truth for what a role can do. Both Postgres RLS policies and the
-- server-side TypeScript permission helper read this table (via fn_has_permission /
-- fn_role_permissions in the next migration) -- neither reimplements the mapping, so the two
-- layers cannot drift apart.
create table public.role_permission (
  role_id uuid not null references public.role(id) on delete cascade,
  permission_id uuid not null references public.permission(id) on delete cascade,
  primary key (role_id, permission_id)
);

alter table public.role_permission enable row level security;

-- Platform admins are NOT school members -- docs/schoolerp_features.md §1.1: "Platform admins
-- can provision and suspend schools without reading operational data by default." Modelling
-- super_admin as a school_member row would force a platform admin to belong to some school,
-- which is wrong. This table is the sole source of the 'super_admin' claim (see
-- custom_access_token_hook). Support impersonation of a specific school is explicitly out of
-- scope for P0 -- when built, it must be a time-boxed, audited action, not a bypass flag.
create table public.platform_admin (
  auth_user_id uuid primary key references public.user_profile(auth_user_id) on delete cascade,
  granted_at timestamptz not null default now()
);

alter table public.platform_admin enable row level security;

-- Membership: which school an identity belongs to, and (via school_member_role) with which
-- roles. campus_id is nullable -- a role can be school-wide (e.g. School Admin) or scoped to
-- one campus once multi-branch schools exist.
create table public.school_member (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references public.user_profile(auth_user_id) on delete cascade,
  school_id uuid not null references public.school(id) on delete cascade,
  campus_id uuid references public.campus(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (auth_user_id, school_id)
);

comment on table public.school_member is
  'Membership join between a global identity and a school. Deliberately NOT unique on
   auth_user_id alone -- see migration header. P0 enforces "one active membership per identity"
   in the application layer (account/membership creation flow), not here.';

create trigger trg_school_member_set_updated_at
  before update on public.school_member
  for each row execute function public.set_updated_at();

alter table public.school_member enable row level security;

-- The roles a membership holds. Modelled as its own table (rather than an array column on
-- school_member) so role_permission joins stay ordinary foreign keys.
create table public.school_member_role (
  school_member_id uuid not null references public.school_member(id) on delete cascade,
  role_id uuid not null references public.role(id) on delete cascade,
  granted_at timestamptz not null default now(),
  primary key (school_member_id, role_id)
);

comment on table public.school_member_role is
  'Backs the roles[] array stamped into the JWT by custom_access_token_hook. A change here
   (grant or revoke) must call revokeSchoolMemberSessions for that auth_user_id -- see
   packages/integrations/auth -- so privilege loss is not delayed by the JWT TTL.';

alter table public.school_member_role enable row level security;

-- Immutable audit trail. Insert + select only; no update or delete policy is defined for any
-- role, which makes rows tamper-evident by omission rather than by a rule someone can forget.
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.school(id) on delete set null,
  actor_auth_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_log is
  'school_id is nullable for platform-level actions (e.g. a Super Admin provisioning a school)
   that have no single tenant. Every other row is tenant-scoped.';

alter table public.audit_log enable row level security;

-- Seed the fixed role taxonomy from docs/schoolerp_features.md §1.2.
insert into public.role (key, label, phase) values
  ('super_admin', 'Super Admin', 'P0'),
  ('school_owner', 'School Owner / Management', 'P1'),
  ('principal', 'Principal / Head', 'P1'),
  ('school_admin', 'School Admin', 'P1'),
  ('accountant', 'Accountant', 'P1'),
  ('teacher', 'Teacher', 'P1'),
  ('class_teacher', 'Class Teacher', 'P1'),
  ('parent', 'Parent / Guardian', 'P2'),
  ('student', 'Student', 'P2'),
  ('librarian', 'Librarian', 'P3'),
  ('transport_manager', 'Transport Manager', 'P3'),
  ('hr_payroll_admin', 'HR / Payroll Admin', 'P3'),
  ('inventory_manager', 'Inventory Manager', 'P3'),
  ('auditor', 'Read-only Auditor', 'P3');

-- Minimal P0 permission set: just enough to prove the RLS-and-server-helper pattern on a real
-- mutation (school branding) ahead of any feature module. P1+ modules add their own permission
-- rows and role_permission grants; they do not touch this function.
insert into public.permission (key, label) values
  ('platform.manage_schools', 'Provision and suspend schools'),
  ('school.manage_profile', 'Edit school profile and academic structure'),
  ('school.manage_branding', 'Edit school branding (logo, name, brand colour)'),
  ('school.manage_members', 'Add or remove school members and assign roles'),
  ('school.view_audit_log', 'View the school''s audit log');

insert into public.role_permission (role_id, permission_id)
select r.id, p.id from public.role r, public.permission p
where r.key = 'super_admin';

insert into public.role_permission (role_id, permission_id)
select r.id, p.id from public.role r, public.permission p
where r.key = 'school_owner'
  and p.key in ('school.manage_profile', 'school.manage_branding', 'school.manage_members', 'school.view_audit_log');

insert into public.role_permission (role_id, permission_id)
select r.id, p.id from public.role r, public.permission p
where r.key = 'school_admin'
  and p.key in ('school.manage_profile', 'school.manage_branding', 'school.manage_members');

insert into public.role_permission (role_id, permission_id)
select r.id, p.id from public.role r, public.permission p
where r.key = 'principal'
  and p.key in ('school.view_audit_log');
