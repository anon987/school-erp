-- P1 Students & Staff, part 3: students.
--
-- `enrollment` is a separate table from `student`, per docs/schoolerp_techstack.md §3's entity
-- list. This is what gives "status history" and "promotion history across academic years"
-- (docs/schoolerp_features.md §B) for free: a new academic year is a new enrollment row, not a
-- field overwritten in place. `student.status` (active/transferred/withdrawn/alumni) is the
-- CURRENT status; its history lives in audit_log (written by the update mutation), the same
-- pattern used for staff "service history" -- one mechanism, not two.
--
-- created_by_import_batch_id is added later, by the import_pipeline migration, to avoid a
-- forward reference to import_batch (which doesn't exist yet at this point in the migration
-- order) -- same pattern as section.class_teacher_staff_id waiting for the staff migration.

insert into public.permission (key, label) values
  ('school.manage_students', 'Create, edit, and manage student records');

insert into public.role_permission (role_id, permission_id)
select r.id, p.id from public.role r, public.permission p
where r.key in ('school_owner', 'school_admin') and p.key = 'school.manage_students';

create table public.student (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  admission_number text not null,
  first_name text not null,
  last_name text not null,
  dob date,
  gender text check (gender in ('male', 'female', 'other')),
  blood_group text,
  category_id uuid references public.student_category(id) on delete set null,
  house_id uuid references public.house(id) on delete set null,
  previous_school_name text,
  previous_school_details jsonb,
  status text not null default 'active' check (status in ('active', 'transferred', 'withdrawn', 'alumni')),
  status_since date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, admission_number)
);

create trigger trg_student_set_updated_at
  before update on public.student
  for each row execute function public.set_updated_at();

alter table public.student enable row level security;

-- One row per student per academic year. roll_number is a plain editable text field, not an
-- auto-incrementing sequence -- real schools assign roll numbers by roster order or
-- alphabetically within a section, not creation order (unlike admission_number, which IS a
-- school-wide auto-incrementing sequence -- see fn_next_school_number).
create table public.enrollment (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  student_id uuid not null references public.student(id) on delete cascade,
  academic_year_id uuid not null references public.academic_year(id) on delete restrict,
  class_id uuid not null references public.class(id) on delete restrict,
  section_id uuid not null references public.section(id) on delete restrict,
  roll_number text,
  status text not null default 'active' check (status in ('active', 'promoted', 'repeated', 'transferred_out')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, student_id, academic_year_id)
);

create trigger trg_enrollment_set_updated_at
  before update on public.enrollment
  for each row execute function public.set_updated_at();

alter table public.enrollment enable row level security;

-- A guardian is its own identity (not embedded on student) because siblings share one. Import
-- scopes guardian matching to "does THIS student already have a guardian with this phone" --
-- not a cross-student/cross-family dedup -- see the import_pipeline migration's comments for
-- why that's a deliberately bounded simplification.
create table public.guardian (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  first_name text not null,
  last_name text,
  occupation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_guardian_set_updated_at
  before update on public.guardian
  for each row execute function public.set_updated_at();

alter table public.guardian enable row level security;

create table public.student_guardian (
  student_id uuid not null references public.student(id) on delete cascade,
  guardian_id uuid not null references public.guardian(id) on delete cascade,
  school_id uuid not null references public.school(id) on delete cascade,
  relationship_type text not null check (relationship_type in ('father', 'mother', 'guardian', 'other')),
  phone text,
  email text,
  is_primary_contact boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (student_id, guardian_id)
);

create trigger trg_student_guardian_set_updated_at
  before update on public.student_guardian
  for each row execute function public.set_updated_at();

alter table public.student_guardian enable row level security;

create table public.student_directory_saved_view (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  created_by_auth_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  is_shared boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.student_directory_saved_view enable row level security;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on
  public.student, public.enrollment, public.guardian, public.student_guardian
  to authenticated;
grant select, insert, update, delete on public.student_directory_saved_view to authenticated;

create policy student_select on public.student for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy student_write on public.student for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_students')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_students')) or public.is_super_admin());

create policy enrollment_select on public.enrollment for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy enrollment_write on public.enrollment for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_students')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_students')) or public.is_super_admin());

create policy guardian_select on public.guardian for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy guardian_write on public.guardian for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_students')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_students')) or public.is_super_admin());

create policy student_guardian_select on public.student_guardian for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy student_guardian_write on public.student_guardian for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_students')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_students')) or public.is_super_admin());

-- Saved views: visible if it's your own, or it's shared and you're in the same school. Any
-- signed-in school member can create their own saved view (no manage_students gate) -- a
-- saved filter is a personal convenience, not a change to student data.
create policy student_directory_saved_view_select on public.student_directory_saved_view
  for select to authenticated
  using (
    created_by_auth_user_id = auth.uid()
    or (is_shared and school_id = public.current_school_id())
    or public.is_super_admin()
  );

create policy student_directory_saved_view_write on public.student_directory_saved_view
  for all to authenticated
  using (created_by_auth_user_id = auth.uid() or public.is_super_admin())
  with check (created_by_auth_user_id = auth.uid() and school_id = public.current_school_id());
