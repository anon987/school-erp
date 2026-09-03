-- P1 Students & Staff, part 5: staff.
--
-- school_member_id is nullable: not every staff member gets a system login (drivers, peons,
-- support staff are common in this client base) -- a `staff` row is an HR record first, an
-- account second. When a staff member DOES need access, this links to the existing P0
-- school_member/school_member_role model directly -- role assignment is not reimplemented
-- here, it reuses what P0 already built.
--
-- "Service history" (docs/schoolerp_features.md §D) is NOT a new table -- see CLAUDE.md's
-- audit_log usage. The staff update mutation (apps/web) writes an audit_log row on
-- department/designation change; querying that gives the history. Same pattern as student
-- status history.

insert into public.permission (key, label) values
  ('school.manage_staff', 'Create, edit, and manage staff records');

insert into public.role_permission (role_id, permission_id)
select r.id, p.id from public.role r, public.permission p
where r.key in ('school_owner', 'school_admin') and p.key = 'school.manage_staff';

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  employee_code text not null,
  first_name text not null,
  last_name text not null,
  dob date,
  gender text check (gender in ('male', 'female', 'other')),
  phone text,
  email text,
  department_id uuid references public.department(id) on delete set null,
  designation_id uuid references public.designation(id) on delete set null,
  joining_date date not null,
  employment_status text not null default 'active' check (employment_status in ('active', 'inactive')),
  school_member_id uuid references public.school_member(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, employee_code)
);

create unique index staff_one_row_per_school_member
  on public.staff (school_member_id)
  where school_member_id is not null;

create trigger trg_staff_set_updated_at
  before update on public.staff
  for each row execute function public.set_updated_at();

alter table public.staff enable row level security;

-- Now that `staff` exists, resolve the forward reference from the master_data migration.
alter table public.section
  add column class_teacher_staff_id uuid references public.staff(id) on delete set null;

create table public.staff_qualification (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  degree text not null,
  institution text,
  year_completed int,
  created_at timestamptz not null default now()
);

alter table public.staff_qualification enable row level security;

-- One row per (teacher, class, section, subject, year). Section-level, not class-level, because
-- different sections of the same class commonly have different teachers for the same subject.
create table public.staff_class_subject (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  academic_year_id uuid not null references public.academic_year(id) on delete cascade,
  class_id uuid not null references public.class(id) on delete cascade,
  section_id uuid not null references public.section(id) on delete cascade,
  subject_id uuid not null references public.subject(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint staff_class_subject_one_teacher_per_slot
    unique (academic_year_id, class_id, section_id, subject_id)
);

comment on constraint staff_class_subject_one_teacher_per_slot on public.staff_class_subject is
  'Deliberately NOT unique on staff_id too -- the constraint is "one teacher per
   class/section/subject/year slot", not "one assignment per teacher". staff_id is what
   changes if a reassignment happens (update the row, not insert a second one).';

alter table public.staff_class_subject enable row level security;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on
  public.staff, public.staff_qualification, public.staff_class_subject
  to authenticated;

create policy staff_select on public.staff for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy staff_write on public.staff for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_staff')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_staff')) or public.is_super_admin());

create policy staff_qualification_select on public.staff_qualification for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy staff_qualification_write on public.staff_qualification for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_staff')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_staff')) or public.is_super_admin());

create policy staff_class_subject_select on public.staff_class_subject for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy staff_class_subject_write on public.staff_class_subject for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_staff')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_staff')) or public.is_super_admin());
