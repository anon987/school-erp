-- P2 Homework & Assignments (docs/schoolerp_features.md §J): create/publish by class+subject,
-- attachments (reusing the polymorphic `document` table again -- CLAUDE.md: "reuse this shape
-- for the next one"), submission tracking, teacher review+remarks, parent/student visibility.
--
-- Like Timetable, `homework` is keyed off the existing P1 `staff_class_subject` assignment
-- rather than letting a post claim an arbitrary teacher/subject pairing -- see
-- packages/db/supabase/migrations/20260905270000_timetable.sql's header comment for why. Same
-- denormalization-trigger shape too.

insert into public.permission (key, label) values
  ('homework.manage', 'Create and publish homework for any class'),
  ('homework.manage_own', 'Create and publish homework for classes/subjects one teaches');

insert into public.role_permission (role_id, permission_id)
select r.id, p.id from public.role r, public.permission p
where r.key in ('school_owner', 'school_admin', 'principal') and p.key = 'homework.manage';

insert into public.role_permission (role_id, permission_id)
select r.id, p.id from public.role r, public.permission p
where r.key in ('teacher', 'class_teacher') and p.key = 'homework.manage_own';

-- ---------------------------------------------------------------------------
-- Shared by every "this teacher owns that class+subject assignment" write policy below --
-- mirrors attendance_record_write's own class-teacher-ownership join (packages/db attendance
-- migration) but against staff_class_subject instead of section.class_teacher_staff_id, since
-- homework is scoped to a specific subject a teacher teaches, not their whole homeroom.
create or replace function public.fn_owns_staff_class_subject(p_staff_class_subject_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.staff_class_subject scs
    join public.staff st on st.id = scs.staff_id
    join public.school_member sm on sm.id = st.school_member_id
    where scs.id = p_staff_class_subject_id and sm.auth_user_id = auth.uid()
  )
$$;

-- Parent-portal visibility needs "is my child currently enrolled in THIS class+section+year",
-- not just "is this school mine" (fn_is_portal_member_of_school) -- homework is section-specific,
-- unlike exam/grade_band/period which are legitimately school-wide config.
create or replace function public.fn_is_guardian_of_section(p_class_id uuid, p_section_id uuid, p_academic_year_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.guardian_portal_account gpa
    join public.student_guardian sg on sg.guardian_id = gpa.guardian_id
    join public.enrollment e on e.student_id = sg.student_id
    where gpa.auth_user_id = auth.uid() and gpa.status = 'active'
      and e.class_id = p_class_id and e.section_id = p_section_id and e.academic_year_id = p_academic_year_id
  )
$$;

-- ---------------------------------------------------------------------------
create table public.homework (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  staff_class_subject_id uuid not null references public.staff_class_subject(id) on delete cascade,
  academic_year_id uuid not null references public.academic_year(id) on delete cascade,
  class_id uuid not null references public.class(id) on delete cascade,
  section_id uuid not null references public.section(id) on delete cascade,
  subject_id uuid not null references public.subject(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  title text not null,
  description text not null,
  due_date date not null,
  published_at timestamptz,
  created_by_auth_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.fn_homework_denormalize()
returns trigger
language plpgsql
as $$
declare
  v_scs record;
begin
  select academic_year_id, class_id, section_id, subject_id, staff_id
    into v_scs
    from public.staff_class_subject
    where id = new.staff_class_subject_id and school_id = new.school_id;
  if not found then
    raise exception 'staff_class_subject % not found in school %', new.staff_class_subject_id, new.school_id;
  end if;

  new.academic_year_id := v_scs.academic_year_id;
  new.class_id := v_scs.class_id;
  new.section_id := v_scs.section_id;
  new.subject_id := v_scs.subject_id;
  new.staff_id := v_scs.staff_id;
  return new;
end;
$$;

create trigger trg_homework_denormalize
  before insert or update on public.homework
  for each row execute function public.fn_homework_denormalize();

create trigger trg_homework_set_updated_at before update on public.homework for each row execute function public.set_updated_at();

alter table public.homework enable row level security;

grant select, insert, update, delete on public.homework to authenticated;

create policy homework_select_staff on public.homework for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy homework_write on public.homework for all to authenticated
  using (
    (school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'homework.manage'))
    or (school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'homework.manage_own') and public.fn_owns_staff_class_subject(staff_class_subject_id))
    or public.is_super_admin()
  )
  with check (
    (school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'homework.manage'))
    or (school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'homework.manage_own') and public.fn_owns_staff_class_subject(staff_class_subject_id))
    or public.is_super_admin()
  );
create policy homework_select_parent on public.homework for select to authenticated
  using (published_at is not null and public.fn_is_guardian_of_section(class_id, section_id, academic_year_id));

-- ---------------------------------------------------------------------------
-- One row per (homework, enrolled student), pre-created at publish time (fn_publish_homework
-- below) -- same "checklist instantiated up front, not computed live" shape as Admissions'
-- application_document, so "who hasn't submitted yet" is a plain filter, not a live roster diff.
create table public.homework_submission (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  homework_id uuid not null references public.homework(id) on delete cascade,
  student_id uuid not null references public.student(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'submitted', 'reviewed')),
  content text,
  document_id uuid references public.document(id) on delete set null,
  submitted_at timestamptz,
  teacher_remarks text,
  reviewed_by_auth_user_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (homework_id, student_id)
);

create trigger trg_homework_submission_set_updated_at before update on public.homework_submission for each row execute function public.set_updated_at();

alter table public.homework_submission enable row level security;

grant select, insert, update on public.homework_submission to authenticated;

create policy homework_submission_select_staff on public.homework_submission for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy homework_submission_write_staff on public.homework_submission for update to authenticated
  using (
    (school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'homework.manage'))
    or (
      school_id = public.current_school_id()
      and public.fn_has_permission(public.current_roles(), 'homework.manage_own')
      and exists (select 1 from public.homework h where h.id = homework_submission.homework_id and public.fn_owns_staff_class_subject(h.staff_class_subject_id))
    )
    or public.is_super_admin()
  )
  with check (
    (school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'homework.manage'))
    or (
      school_id = public.current_school_id()
      and public.fn_has_permission(public.current_roles(), 'homework.manage_own')
      and exists (select 1 from public.homework h where h.id = homework_submission.homework_id and public.fn_owns_staff_class_subject(h.staff_class_subject_id))
    )
    or public.is_super_admin()
  );

-- Parent submits (content/document_id/status='submitted') on the student's behalf -- no separate
-- student login exists (CLAUDE.md/product decision), same proxy pattern as the Portal's leave
-- application. Blocked once a teacher has already reviewed it (`status <> 'reviewed'` in USING),
-- so a parent can't edit a submission out from under a teacher's remarks after the fact.
create policy homework_submission_select_parent on public.homework_submission for select to authenticated
  using (public.fn_is_guardian_of(student_id));
create policy homework_submission_update_parent on public.homework_submission for update to authenticated
  using (status <> 'reviewed' and public.fn_is_guardian_of(student_id))
  with check (public.fn_is_guardian_of(student_id));

-- No insert grant used by any policy above (all rows come from fn_publish_homework) -- INSERT is
-- still granted at the table level for symmetry with other tables in this schema, but no INSERT
-- policy exists for `authenticated`, so it is effectively unreachable outside SECURITY DEFINER/
-- table-owner contexts, same as `notification`'s shape in the Communication migration.

-- ---------------------------------------------------------------------------
-- Publishes a homework post: pre-creates one pending submission row per student currently
-- enrolled in the post's class+section+year, then stamps published_at. SECURITY INVOKER (unlike
-- Communication's fn_publish_notice) -- reading `enrollment` is already broadly readable by any
-- staff member (same policy shape as attendance/timetable), and inserting into
-- homework_submission needs no permission the caller doesn't already have to reach this function
-- in the first place (homework_write's own RLS policy, checked by the caller reading/writing
-- `homework` before this runs) -- there is no cross-permission-boundary seam to cross here the
-- way Communication's audience fan-out had.
create or replace function public.fn_publish_homework(p_homework_id uuid, p_school_id uuid)
returns void
language plpgsql
as $$
declare
  v_homework record;
begin
  if not (public.current_school_id() = p_school_id or public.is_super_admin()) then
    raise exception 'Forbidden: % is not the caller''s school', p_school_id;
  end if;

  select * into v_homework from public.homework where id = p_homework_id and school_id = p_school_id for update;
  if not found then
    raise exception 'Homework % not found in school %', p_homework_id, p_school_id;
  end if;
  if v_homework.published_at is not null then
    raise exception 'Homework % has already been published', p_homework_id;
  end if;
  if not (
    public.fn_has_permission(public.current_roles(), 'homework.manage')
    or (public.fn_has_permission(public.current_roles(), 'homework.manage_own') and public.fn_owns_staff_class_subject(v_homework.staff_class_subject_id))
    or public.is_super_admin()
  ) then
    raise exception 'Forbidden: no permission to publish this homework';
  end if;

  insert into public.homework_submission (school_id, homework_id, student_id)
  select p_school_id, p_homework_id, e.student_id
  from public.enrollment e
  where e.school_id = p_school_id and e.class_id = v_homework.class_id and e.section_id = v_homework.section_id and e.academic_year_id = v_homework.academic_year_id
  on conflict (homework_id, student_id) do nothing;

  update public.homework set published_at = now() where id = p_homework_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Extend the polymorphic document table (packages/db .../20260903214111_documents.sql, already
-- extended once for 'application' in 20260905230000_admissions.sql) to also accept 'homework'
-- (the teacher's own attachment on the post) and 'homework_submission' (a student's attached
-- work) as owner types.
alter table public.document drop constraint document_owner_type_check;
alter table public.document add constraint document_owner_type_check
  check (owner_type in ('student', 'staff', 'application', 'homework', 'homework_submission'));

create or replace function public.fn_validate_document_owner()
returns trigger
language plpgsql
as $$
declare
  v_exists boolean;
begin
  if new.owner_type = 'student' then
    select exists(select 1 from public.student where id = new.owner_id and school_id = new.school_id) into v_exists;
  elsif new.owner_type = 'staff' then
    select exists(select 1 from public.staff where id = new.owner_id and school_id = new.school_id) into v_exists;
  elsif new.owner_type = 'application' then
    select exists(select 1 from public.application where id = new.owner_id and school_id = new.school_id) into v_exists;
  elsif new.owner_type = 'homework' then
    select exists(select 1 from public.homework where id = new.owner_id and school_id = new.school_id) into v_exists;
  elsif new.owner_type = 'homework_submission' then
    select exists(select 1 from public.homework_submission where id = new.owner_id and school_id = new.school_id) into v_exists;
  else
    v_exists := false;
  end if;

  if not v_exists then
    raise exception 'document.owner_id % does not reference an existing % in school %',
      new.owner_id, new.owner_type, new.school_id;
  end if;

  return new;
end;
$$;

-- Write access to a 'homework' or 'homework_submission' document needs the SAME ownership check
-- as the row it attaches to -- a teacher can attach to their own homework post; a parent can
-- attach to their own child's submission. Two more owner_type branches on the same policies
-- extended for 'application', not new policies.
drop policy document_insert on public.document;
create policy document_insert on public.document for insert to authenticated
  with check (
    (
      school_id = public.current_school_id()
      and (
        (owner_type = 'student' and public.fn_has_permission(public.current_roles(), 'school.manage_students'))
        or (owner_type = 'staff' and public.fn_has_permission(public.current_roles(), 'school.manage_staff'))
        or (owner_type = 'application' and public.fn_has_permission(public.current_roles(), 'school.manage_admissions'))
        or (
          owner_type = 'homework'
          and (
            public.fn_has_permission(public.current_roles(), 'homework.manage')
            or exists (select 1 from public.homework h where h.id = document.owner_id and public.fn_owns_staff_class_subject(h.staff_class_subject_id))
          )
        )
        or (owner_type = 'homework_submission' and exists (select 1 from public.homework_submission hs where hs.id = document.owner_id and public.fn_is_guardian_of(hs.student_id)))
      )
    )
    or public.is_super_admin()
  );

drop policy document_delete on public.document;
create policy document_delete on public.document for delete to authenticated
  using (
    (
      school_id = public.current_school_id()
      and (
        (owner_type = 'student' and public.fn_has_permission(public.current_roles(), 'school.manage_students'))
        or (owner_type = 'staff' and public.fn_has_permission(public.current_roles(), 'school.manage_staff'))
        or (owner_type = 'application' and public.fn_has_permission(public.current_roles(), 'school.manage_admissions'))
        or (
          owner_type = 'homework'
          and (
            public.fn_has_permission(public.current_roles(), 'homework.manage')
            or exists (select 1 from public.homework h where h.id = document.owner_id and public.fn_owns_staff_class_subject(h.staff_class_subject_id))
          )
        )
        or (owner_type = 'homework_submission' and exists (select 1 from public.homework_submission hs where hs.id = document.owner_id and public.fn_is_guardian_of(hs.student_id)))
      )
    )
    or public.is_super_admin()
  );

drop policy documents_bucket_insert on storage.objects;
create policy documents_bucket_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (
      public.is_super_admin()
      or (
        (storage.foldername(name))[1] = public.current_school_id()::text
        and (
          ((storage.foldername(name))[2] = 'student' and public.fn_has_permission(public.current_roles(), 'school.manage_students'))
          or ((storage.foldername(name))[2] = 'staff' and public.fn_has_permission(public.current_roles(), 'school.manage_staff'))
          or ((storage.foldername(name))[2] = 'application' and public.fn_has_permission(public.current_roles(), 'school.manage_admissions'))
          or ((storage.foldername(name))[2] = 'homework' and (public.fn_has_permission(public.current_roles(), 'homework.manage') or public.fn_has_permission(public.current_roles(), 'homework.manage_own')))
          or (storage.foldername(name))[2] = 'homework_submission'
        )
      )
    )
  );

comment on policy documents_bucket_insert on storage.objects is
  'The homework_submission branch has no permission check here (unlike the others) -- a parent
   uploading their child''s work has no school.manage_* permission at all; the document row
   insert''s own RLS policy (document_insert, above) is what actually verifies
   fn_is_guardian_of(hs.student_id) for that owner_id, since storage path segments alone cannot
   express that check. This mirrors how portal reads are verified at the table level throughout
   this schema, not at the storage-path level.';

drop policy documents_bucket_delete on storage.objects;
create policy documents_bucket_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and (
      public.is_super_admin()
      or (
        (storage.foldername(name))[1] = public.current_school_id()::text
        and (
          ((storage.foldername(name))[2] = 'student' and public.fn_has_permission(public.current_roles(), 'school.manage_students'))
          or ((storage.foldername(name))[2] = 'staff' and public.fn_has_permission(public.current_roles(), 'school.manage_staff'))
          or ((storage.foldername(name))[2] = 'application' and public.fn_has_permission(public.current_roles(), 'school.manage_admissions'))
          or ((storage.foldername(name))[2] = 'homework' and (public.fn_has_permission(public.current_roles(), 'homework.manage') or public.fn_has_permission(public.current_roles(), 'homework.manage_own')))
          or (storage.foldername(name))[2] = 'homework_submission'
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Parent portal read access to the master-data staff/class/subject rows homework's UI needs to
-- render (subject name, teacher name) -- exam_subject/mark already got the same treatment in the
-- Parent Portal migration for the same reason.
create policy staff_class_subject_select_parent on public.staff_class_subject for select to authenticated
  using (public.fn_is_portal_member_of_school(school_id));
