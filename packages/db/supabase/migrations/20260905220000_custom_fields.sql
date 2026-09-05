-- P0 Master Data, "Configurable custom fields on student and staff records"
-- (docs/schoolerp_features.md §A). A school defines the field once (Master Data, admin config);
-- the value is then entered per student/staff record. Two tables, same polymorphic-owner shape
-- `document` already uses (owner_type/owner_id + a validating trigger, since Postgres has no
-- conditional FK) -- entity_type/entity_id here, kept consistent with that precedent rather than
-- inventing a second convention for the same problem.
create table public.custom_field_definition (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  entity_type text not null check (entity_type in ('student', 'staff')),
  field_key text not null,
  label text not null,
  field_type text not null check (field_type in ('text', 'number', 'date', 'boolean', 'select')),
  -- Only meaningful (and populated) when field_type = 'select': a JSON array of option strings.
  select_options jsonb,
  is_required boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, entity_type, field_key)
);

create trigger trg_custom_field_definition_set_updated_at
  before update on public.custom_field_definition
  for each row execute function public.set_updated_at();

alter table public.custom_field_definition enable row level security;

grant select, insert, update, delete on public.custom_field_definition to authenticated;

create policy custom_field_definition_select on public.custom_field_definition for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());

-- Same permission as the rest of Master Data (school.manage_master_data) -- defining what fields
-- exist is school configuration, same category as grade bands / student categories / houses.
create policy custom_field_definition_write on public.custom_field_definition for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_master_data')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_master_data')) or public.is_super_admin());

create table public.custom_field_value (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  definition_id uuid not null references public.custom_field_definition(id) on delete cascade,
  entity_type text not null check (entity_type in ('student', 'staff')),
  entity_id uuid not null,
  -- Stored as text regardless of field_type (like most EAV-style value tables) -- parsed and
  -- validated against the definition's field_type at the application layer (zod), the same
  -- boundary-validates-everything rule CLAUDE.md states for every other input. Not queried or
  -- reported on anywhere in the spec, so a typed-per-row-type schema would be complexity with no
  -- payoff.
  value text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (definition_id, entity_id)
);

create trigger trg_custom_field_value_set_updated_at
  before update on public.custom_field_value
  for each row execute function public.set_updated_at();

comment on column public.custom_field_value.entity_id is
  'Polymorphic reference to student.id or staff.id depending on entity_type -- validated by the
   trigger below, same pattern as document.owner_id.';

create or replace function public.fn_validate_custom_field_value()
returns trigger
language plpgsql
as $$
declare
  v_exists boolean;
  v_def_entity_type text;
begin
  select entity_type into v_def_entity_type from public.custom_field_definition where id = new.definition_id;
  if v_def_entity_type is distinct from new.entity_type then
    raise exception 'custom_field_value.entity_type (%) does not match its definition''s entity_type (%)', new.entity_type, v_def_entity_type;
  end if;

  if new.entity_type = 'student' then
    select exists(select 1 from public.student where id = new.entity_id and school_id = new.school_id) into v_exists;
  elsif new.entity_type = 'staff' then
    select exists(select 1 from public.staff where id = new.entity_id and school_id = new.school_id) into v_exists;
  else
    v_exists := false;
  end if;

  if not v_exists then
    raise exception 'custom_field_value.entity_id % does not reference an existing % in school %',
      new.entity_id, new.entity_type, new.school_id;
  end if;

  return new;
end;
$$;

create trigger trg_custom_field_value_validate
  before insert or update on public.custom_field_value
  for each row execute function public.fn_validate_custom_field_value();

alter table public.custom_field_value enable row level security;

grant select, insert, update, delete on public.custom_field_value to authenticated;

create policy custom_field_value_select on public.custom_field_value for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());

-- Same per-entity-type permission split as document_insert/document_delete -- entering a value on
-- a student's record needs school.manage_students, on a staff record school.manage_staff (not
-- school.manage_master_data, which only governs the field *definitions* above).
create policy custom_field_value_write on public.custom_field_value for all to authenticated
  using (
    (
      school_id = public.current_school_id()
      and (
        (entity_type = 'student' and public.fn_has_permission(public.current_roles(), 'school.manage_students'))
        or (entity_type = 'staff' and public.fn_has_permission(public.current_roles(), 'school.manage_staff'))
      )
    )
    or public.is_super_admin()
  )
  with check (
    (
      school_id = public.current_school_id()
      and (
        (entity_type = 'student' and public.fn_has_permission(public.current_roles(), 'school.manage_students'))
        or (entity_type = 'staff' and public.fn_has_permission(public.current_roles(), 'school.manage_staff'))
      )
    )
    or public.is_super_admin()
  );
