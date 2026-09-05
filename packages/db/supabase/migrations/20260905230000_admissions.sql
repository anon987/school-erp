-- P2 Admissions & Enquiries (docs/schoolerp_features.md §C): enquiry -> application ->
-- configurable stages -> document checklist -> confirmation. Confirmation auto-creates the
-- student + current-year enrollment; fee mapping needs no separate row for the common case --
-- fn_generate_yearly_invoices (fees migrations) already matches an invoice to a fee_structure by
-- class_id/category_id at generation time, so enrollment IS the fee mapping. The parent-account
-- LINK is created here too (guardian_portal_account); the invite email and portal login pages
-- are Portal's job (P2, next module) -- see that table's comment below for why the data model
-- belongs here anyway.

insert into public.permission (key, label) values
  ('school.manage_admissions', 'Create, edit, and manage enquiries, applications, and admissions');

insert into public.role_permission (role_id, permission_id)
select r.id, p.id from public.role r, public.permission p
where r.key in ('school_owner', 'school_admin') and p.key = 'school.manage_admissions';

-- ---------------------------------------------------------------------------
-- Admission pipeline stages -- configurable per school (CLAUDE.md: configure, don't hard-code),
-- same bare-list shape as department/designation/house, but with a `stage_type` marker so the
-- three terminal outcomes stay machine-readable no matter what a school renames the in-between
-- stages to. fn_confirm_admission below keys off stage_type, never off name.
create table public.admission_stage (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  stage_type text not null default 'in_progress' check (stage_type in ('in_progress', 'admitted', 'rejected', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, name)
);

create trigger trg_admission_stage_set_updated_at
  before update on public.admission_stage
  for each row execute function public.set_updated_at();

alter table public.admission_stage enable row level security;

grant select, insert, update, delete on public.admission_stage to authenticated;

create policy admission_stage_select on public.admission_stage for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy admission_stage_write on public.admission_stage for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_admissions')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_admissions')) or public.is_super_admin());

-- Every existing school gets a sensible default pipeline -- admin can rename/reorder/add via
-- Master Data, but starts with something usable rather than an empty list on day one. A future
-- school-provisioning flow (still admin-driven per CLAUDE.md, not self-serve) should seed the
-- same eight rows for a newly created school.
insert into public.admission_stage (school_id, name, sort_order, stage_type)
select s.id, stage.name, stage.sort_order, stage.stage_type
from public.school s
cross join (values
  ('Enquiry', 0, 'in_progress'),
  ('Application Submitted', 1, 'in_progress'),
  ('Documents Verification', 2, 'in_progress'),
  ('Test / Interview', 3, 'in_progress'),
  ('Offer Made', 4, 'in_progress'),
  ('Admitted', 5, 'admitted'),
  ('Rejected', 6, 'rejected'),
  ('Withdrawn', 7, 'withdrawn')
) as stage(name, sort_order, stage_type)
on conflict (school_id, name) do nothing;

-- ---------------------------------------------------------------------------
-- Enquiry -- top of funnel, source-tracked, may or may not become a formal application.
create table public.enquiry (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  first_name text not null,
  last_name text,
  dob date,
  phone text,
  email text,
  class_interested_id uuid references public.class(id) on delete set null,
  source text not null default 'other' check (source in ('walk_in', 'referral', 'phone', 'website', 'advertisement', 'other')),
  status text not null default 'open' check (status in ('open', 'converted', 'closed_lost')),
  assigned_to_staff_id uuid references public.staff(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_enquiry_set_updated_at
  before update on public.enquiry
  for each row execute function public.set_updated_at();

alter table public.enquiry enable row level security;

grant select, insert, update, delete on public.enquiry to authenticated;

create policy enquiry_select on public.enquiry for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy enquiry_write on public.enquiry for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_admissions')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_admissions')) or public.is_super_admin());

-- ---------------------------------------------------------------------------
-- Application -- the formal record that moves through admission_stage. enquiry_id is nullable:
-- a sibling admission or a walk-in the school decides to fast-track can go straight to an
-- application with no enquiry row at all.
create table public.application (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  enquiry_id uuid references public.enquiry(id) on delete set null,
  academic_year_id uuid not null references public.academic_year(id) on delete restrict,
  applicant_first_name text not null,
  applicant_last_name text not null,
  dob date,
  gender text check (gender in ('male', 'female', 'other')),
  category_id uuid references public.student_category(id) on delete set null,
  class_applying_for_id uuid not null references public.class(id) on delete restrict,
  guardian_name text,
  guardian_phone text,
  guardian_email text,
  current_stage_id uuid not null references public.admission_stage(id) on delete restrict,
  confirmed_student_id uuid references public.student(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_application_set_updated_at
  before update on public.application
  for each row execute function public.set_updated_at();

alter table public.application enable row level security;

grant select, insert, update, delete on public.application to authenticated;

create policy application_select on public.application for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy application_write on public.application for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_admissions')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_admissions')) or public.is_super_admin());

-- ---------------------------------------------------------------------------
-- Stage transition log -- also carries the admission test/interview record (score/notes) per
-- §C, since a school's test format varies too much to model as fixed columns; a generic
-- score+notes pair per stage-entry event covers it without fields half of schools leave null.
create table public.application_stage_event (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  application_id uuid not null references public.application(id) on delete cascade,
  stage_id uuid not null references public.admission_stage(id) on delete restrict,
  score numeric,
  notes text,
  recorded_by_auth_user_id uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null default now()
);

alter table public.application_stage_event enable row level security;

-- Insert + select only, like audit_log: a stage history that could be edited after the fact
-- isn't a history.
grant select, insert on public.application_stage_event to authenticated;

create policy application_stage_event_select on public.application_stage_event for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy application_stage_event_insert on public.application_stage_event for insert to authenticated
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_admissions')) or public.is_super_admin());

-- ---------------------------------------------------------------------------
-- Document checklist type -- configurable per school (birth certificate, transfer certificate,
-- previous marksheet, photo, ...), same bare-list shape as department/designation/house/
-- admission_stage above.
create table public.admission_document_type (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  name text not null,
  is_required boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, name)
);

create trigger trg_admission_document_type_set_updated_at
  before update on public.admission_document_type
  for each row execute function public.set_updated_at();

alter table public.admission_document_type enable row level security;

grant select, insert, update, delete on public.admission_document_type to authenticated;

create policy admission_document_type_select on public.admission_document_type for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy admission_document_type_write on public.admission_document_type for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_admissions')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_admissions')) or public.is_super_admin());

insert into public.admission_document_type (school_id, name, is_required, sort_order)
select s.id, doc.name, doc.is_required, doc.sort_order
from public.school s
cross join (values
  ('Birth Certificate', true, 0),
  ('Transfer Certificate', false, 1),
  ('Previous Marksheet', false, 2),
  ('Photo', true, 3)
) as doc(name, is_required, sort_order)
on conflict (school_id, name) do nothing;

-- ---------------------------------------------------------------------------
-- Per-application checklist state. The uploaded file itself, once present, is a row in the
-- existing polymorphic `document` table (owner_type='application') -- CLAUDE.md: "reuse this
-- shape for the next one rather than inventing a third naming convention." This table is the
-- CHECKLIST (what's required and its verification state), not the file storage.
create table public.application_document (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  application_id uuid not null references public.application(id) on delete cascade,
  document_type_id uuid not null references public.admission_document_type(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'uploaded', 'verified')),
  document_id uuid references public.document(id) on delete set null,
  verified_by_auth_user_id uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (application_id, document_type_id)
);

create trigger trg_application_document_set_updated_at
  before update on public.application_document
  for each row execute function public.set_updated_at();

alter table public.application_document enable row level security;

grant select, insert, update, delete on public.application_document to authenticated;

create policy application_document_select on public.application_document for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());
create policy application_document_write on public.application_document for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_admissions')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_admissions')) or public.is_super_admin());

-- ---------------------------------------------------------------------------
-- Extend the polymorphic document table (packages/db .../20260903214111_documents.sql) to accept
-- 'application' as a third owner_type, instead of building a parallel storage table -- same
-- reuse instruction as application_document's comment above.
alter table public.document drop constraint document_owner_type_check;
alter table public.document add constraint document_owner_type_check
  check (owner_type in ('student', 'staff', 'application'));

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

drop policy document_insert on public.document;
create policy document_insert on public.document for insert to authenticated
  with check (
    (
      school_id = public.current_school_id()
      and (
        (owner_type = 'student' and public.fn_has_permission(public.current_roles(), 'school.manage_students'))
        or (owner_type = 'staff' and public.fn_has_permission(public.current_roles(), 'school.manage_staff'))
        or (owner_type = 'application' and public.fn_has_permission(public.current_roles(), 'school.manage_admissions'))
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
        )
      )
    )
  );

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
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Parent portal account link -- the data model Admissions' confirmation flow needs today
-- (creating the auth user + this row), even though the invite email and login pages are
-- Portal's job (P2, next module). `status` distinguishes "auth user created, no email sent yet"
-- from "invite actually sent" from "guardian has signed in at least once" -- Portal's bulk-invite
-- job (for the 2,200 already-imported guardians) and this table's row-per-new-admission reach
-- 'invited' via the SAME worker-side mechanism from two different triggers, not two
-- implementations (see the "one mechanism, two triggers" precedent in setMemberRoles).
-- 'blocked_no_contact' covers a guardian with no email on file -- only email_password is a live
-- auth strategy today (packages/integrations/src/auth), so a guardian with phone only cannot get
-- an account until phone+OTP ships; that is a real product constraint, not a bug to hide.
create table public.guardian_portal_account (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  guardian_id uuid not null references public.guardian(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending_invite' check (status in ('pending_invite', 'blocked_no_contact', 'invited', 'active', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, guardian_id)
);

create trigger trg_guardian_portal_account_set_updated_at
  before update on public.guardian_portal_account
  for each row execute function public.set_updated_at();

alter table public.guardian_portal_account enable row level security;

grant select on public.guardian_portal_account to authenticated;

create policy guardian_portal_account_select on public.guardian_portal_account for select to authenticated
  using (
    (school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_admissions'))
    or auth_user_id = auth.uid()
    or public.is_super_admin()
  );

-- No insert/update/delete grant to `authenticated` -- every write goes through apps/worker's
-- service-role client (creating the auth.users row needs the Admin API, which never reaches the
-- client -- CLAUDE.md), the same shape school_member_role writes already use via setMemberRoles.

-- ---------------------------------------------------------------------------
-- Confirm admission: atomically creates the student + current-year enrollment, links the
-- application to it, and moves current_stage_id to the school's 'admitted' stage. Guardian
-- portal-account creation happens in the calling server action via apps/worker (needs the
-- service-role client, same reason school_member writes do) -- this function only owns the part
-- plain RLS-scoped SQL can do.
--
-- SECURITY INVOKER (the default -- not declared SECURITY DEFINER): every insert/update below is
-- still subject to student/enrollment's own RLS write policies (school.manage_students), not
-- just application's (school.manage_admissions). In practice both permissions are held by the
-- same roles (school_owner, school_admin) today, so this is not a functional restriction, but a
-- future admissions-only role would need school.manage_students granted too to call this -- a
-- deliberate consequence of NOT bypassing student's RLS with a definer function, not an oversight.
create or replace function public.fn_confirm_admission(
  p_application_id uuid,
  p_school_id uuid,
  p_section_id uuid,
  p_actor_auth_user_id uuid
)
returns uuid
language plpgsql
as $$
declare
  v_app record;
  v_admitted_stage_id uuid;
  v_admission_number text;
  v_student_id uuid;
begin
  select * into v_app from public.application
  where id = p_application_id and school_id = p_school_id
  for update;

  if not found then
    raise exception 'Application % not found in school %', p_application_id, p_school_id;
  end if;
  if v_app.confirmed_student_id is not null then
    raise exception 'Application % is already confirmed (student %)', p_application_id, v_app.confirmed_student_id;
  end if;

  select id into v_admitted_stage_id from public.admission_stage
  where school_id = p_school_id and stage_type = 'admitted'
  limit 1;
  if v_admitted_stage_id is null then
    raise exception 'School % has no admission_stage with stage_type = admitted', p_school_id;
  end if;

  select public.fn_next_school_number(p_school_id, 'student_admission') into v_admission_number;

  insert into public.student (school_id, admission_number, first_name, last_name, dob, gender, category_id, status)
  values (p_school_id, v_admission_number, v_app.applicant_first_name, v_app.applicant_last_name, v_app.dob, v_app.gender, v_app.category_id, 'active')
  returning id into v_student_id;

  insert into public.enrollment (school_id, student_id, academic_year_id, class_id, section_id)
  values (p_school_id, v_student_id, v_app.academic_year_id, v_app.class_applying_for_id, p_section_id);

  update public.application
  set confirmed_student_id = v_student_id, current_stage_id = v_admitted_stage_id
  where id = p_application_id;

  insert into public.application_stage_event (school_id, application_id, stage_id, notes, recorded_by_auth_user_id)
  values (p_school_id, p_application_id, v_admitted_stage_id, 'Admission confirmed; student record created.', p_actor_auth_user_id);

  insert into public.audit_log (school_id, actor_auth_user_id, action, entity_type, entity_id, metadata)
  values (p_school_id, p_actor_auth_user_id, 'application.confirmed', 'application', p_application_id, jsonb_build_object('student_id', v_student_id));

  return v_student_id;
end;
$$;
