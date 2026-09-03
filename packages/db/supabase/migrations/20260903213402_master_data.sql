-- P1 Students & Staff, part 1: master/reference data.
--
-- P0 explicitly skipped "School Setup & Master Data" (docs/schoolerp_features.md §A) as a
-- feature module. Students & Staff cannot function without at least the data model for it --
-- students reference class/section, staff reference department/designation. This migration
-- builds ONLY the tables + RLS + (separately) realistic seed data. There is deliberately no
-- admin UI to create/edit these yet -- a school picking its own classes/sections/departments
-- during onboarding needs a real settings screen, not free-text "add new" boxes scattered
-- across student/staff forms (that produces "Science"/"science"/"Sciences" duplicates, and in
-- a multi-school product it repeats in every school). That UI is the next ticket after this one.

insert into public.permission (key, label) values
  ('school.manage_master_data', 'Manage classes, sections, subjects, departments, designations, houses, categories');

insert into public.role_permission (role_id, permission_id)
select r.id, p.id from public.role r, public.permission p
where r.key in ('school_owner', 'school_admin') and p.key = 'school.manage_master_data';

create table public.academic_year (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, name),
  check (end_date > start_date)
);

create unique index academic_year_one_current_per_school
  on public.academic_year (school_id)
  where is_current;

create trigger trg_academic_year_set_updated_at
  before update on public.academic_year
  for each row execute function public.set_updated_at();

alter table public.academic_year enable row level security;

create table public.class (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, name)
);

create trigger trg_class_set_updated_at
  before update on public.class
  for each row execute function public.set_updated_at();

alter table public.class enable row level security;

create table public.section (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  class_id uuid not null references public.class(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, name)
);

comment on table public.section is
  'class_teacher_staff_id is added by a later migration (staff_and_documents), once the staff
   table exists -- avoids a forward reference in this migration.';

create trigger trg_section_set_updated_at
  before update on public.section
  for each row execute function public.set_updated_at();

alter table public.section enable row level security;

create table public.subject (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  name text not null,
  code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, name)
);

create trigger trg_subject_set_updated_at
  before update on public.subject
  for each row execute function public.set_updated_at();

alter table public.subject enable row level security;

create table public.class_subject (
  class_id uuid not null references public.class(id) on delete cascade,
  subject_id uuid not null references public.subject(id) on delete cascade,
  primary key (class_id, subject_id)
);

alter table public.class_subject enable row level security;

create table public.department (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, name)
);

create trigger trg_department_set_updated_at
  before update on public.department
  for each row execute function public.set_updated_at();

alter table public.department enable row level security;

create table public.designation (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, name)
);

create trigger trg_designation_set_updated_at
  before update on public.designation
  for each row execute function public.set_updated_at();

alter table public.designation enable row level security;

create table public.house (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, name)
);

create trigger trg_house_set_updated_at
  before update on public.house
  for each row execute function public.set_updated_at();

alter table public.house enable row level security;

create table public.student_category (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  key text not null,
  label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, key)
);

create trigger trg_student_category_set_updated_at
  before update on public.student_category
  for each row execute function public.set_updated_at();

alter table public.student_category enable row level security;

-- ---------------------------------------------------------------------------
-- RLS: every table here follows the same shape -- any current-school member
-- can read (needed for dropdowns everywhere), only school.manage_master_data
-- can write. class_subject has no school_id of its own; it's scoped through class.
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on
  public.academic_year, public.class, public.section, public.subject,
  public.department, public.designation, public.house, public.student_category
  to authenticated;
grant select, insert, delete on public.class_subject to authenticated;

create policy academic_year_select on public.academic_year for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy academic_year_write on public.academic_year for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_master_data')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_master_data')) or public.is_super_admin());

create policy class_select on public.class for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy class_write on public.class for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_master_data')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_master_data')) or public.is_super_admin());

create policy section_select on public.section for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy section_write on public.section for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_master_data')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_master_data')) or public.is_super_admin());

create policy subject_select on public.subject for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy subject_write on public.subject for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_master_data')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_master_data')) or public.is_super_admin());

create policy class_subject_select on public.class_subject for select to authenticated
  using (
    exists (select 1 from public.class c where c.id = class_subject.class_id and c.school_id = public.current_school_id())
    or public.is_super_admin()
  );
create policy class_subject_write on public.class_subject for all to authenticated
  using (
    exists (
      select 1 from public.class c where c.id = class_subject.class_id
        and c.school_id = public.current_school_id()
        and public.fn_has_permission(public.current_roles(), 'school.manage_master_data')
    ) or public.is_super_admin()
  )
  with check (
    exists (
      select 1 from public.class c where c.id = class_subject.class_id
        and c.school_id = public.current_school_id()
        and public.fn_has_permission(public.current_roles(), 'school.manage_master_data')
    ) or public.is_super_admin()
  );

create policy department_select on public.department for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy department_write on public.department for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_master_data')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_master_data')) or public.is_super_admin());

create policy designation_select on public.designation for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy designation_write on public.designation for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_master_data')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_master_data')) or public.is_super_admin());

create policy house_select on public.house for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy house_write on public.house for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_master_data')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_master_data')) or public.is_super_admin());

create policy student_category_select on public.student_category for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy student_category_write on public.student_category for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_master_data')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_master_data')) or public.is_super_admin());
