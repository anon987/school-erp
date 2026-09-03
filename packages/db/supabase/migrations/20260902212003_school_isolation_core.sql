-- School isolation layer, part 1: the tenant record itself and what it owns directly.
--
-- `school` is the isolation boundary (docs/schoolerp_features.md §1.1). It is deliberately
-- the one table in the product that is NOT filtered by a school_id column, because it IS the
-- school_id's referent. Its RLS policy (added in the rls_helpers_and_policies migration)
-- restricts rows to schools the caller has a school_member row for, instead.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Shared BEFORE UPDATE trigger: stamps updated_at = now() on every touched row.';

create table public.school (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  board text,
  address text,
  contact_phone text,
  contact_email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.school is
  'One row per tenant. The isolation boundary for every other business table.';
comment on column public.school.board is
  'Free text (e.g. "UP Board", "CBSE"). Not an enum -- boards vary per school and this is
   configuration, not a code branch.';

create trigger trg_school_set_updated_at
  before update on public.school
  for each row execute function public.set_updated_at();

alter table public.school enable row level security;

-- Branch/campus, modelled from day one per docs/schoolerp_techstack.md §2.3, even though the
-- pilot school has exactly one branch. Retrofitting this column across every table later would
-- be a much larger migration than carrying it now.
create table public.campus (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, name)
);

comment on table public.campus is
  'Branch/campus under a school. Single-branch schools get one default campus that the UI hides.';

-- At most one default campus per school.
create unique index campus_one_default_per_school
  on public.campus (school_id)
  where is_default;

create trigger trg_campus_set_updated_at
  before update on public.campus
  for each row execute function public.set_updated_at();

alter table public.campus enable row level security;

-- Per-school branding (docs/schoolerp_features.md §A, §A2; docs/schoolerp_techstack.md §7a).
-- Kept as its own table rather than columns on `school` so branding has its own lifecycle
-- (audit history, future versioning) without widening the core tenant record.
--
-- brand_color_hex is the ONE hue a school picks. The derived light/dark accent ramp and its
-- WCAG AA contrast clamp are computed in application code at save time (see
-- packages/ui/src/theme) -- this table stores the school's input and the validated output the
-- theme provider actually injects, not a free-form palette.
create table public.school_branding (
  school_id uuid primary key references public.school(id) on delete cascade,
  display_name text not null,
  logo_url text,
  brand_color_hex text not null check (brand_color_hex ~* '^#[0-9a-f]{6}$'),
  brand_ramp jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.school_branding.brand_color_hex is
  'The single hue the school picked. Raw input, pre-contrast-clamp.';
comment on column public.school_branding.brand_ramp is
  'Derived + WCAG-AA-clamped light/dark token values computed on save. Never hand-edited.
   Status colours are never derived from this -- they are fixed defaults, not themeable.';

create trigger trg_school_branding_set_updated_at
  before update on public.school_branding
  for each row execute function public.set_updated_at();

alter table public.school_branding enable row level security;

-- Feature flags per school (docs/schoolerp_techstack.md §8). A module being visible to a
-- school is data, never an `if (schoolName === ...)` in code.
create table public.school_module_flag (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  module_key text not null,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, module_key)
);

create trigger trg_school_module_flag_set_updated_at
  before update on public.school_module_flag
  for each row execute function public.set_updated_at();

alter table public.school_module_flag enable row level security;
