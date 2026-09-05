-- P2 Parent & Student Portal (docs/schoolerp_features.md §L). Route group `(portal)` (see
-- docs/schoolerp_techstack.md §2.4) is a separate identity from staff: a guardian has no
-- school_member row, so their JWT carries no school_id/roles claims (custom_access_token_hook
-- only stamps those for staff). Every read this migration grants is therefore a SECOND,
-- independent permissive RLS policy layered on top of the existing staff-only policies -- not a
-- change to them -- keyed off `guardian_portal_account` (P2 Admissions migration) instead of
-- current_school_id()/current_roles().
--
-- CLAUDE.md: "Parent access must verify the student_guardian link server-side on every request,
-- not filter client-side." These two helpers are that verification, done once in SQL so every
-- table below (and every future one) uses the same check instead of each screen re-implementing
-- it in the app layer.

create or replace function public.fn_is_portal_member_of_school(p_school_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.guardian_portal_account
    where auth_user_id = auth.uid() and status = 'active' and school_id = p_school_id
  )
$$;

create or replace function public.fn_is_guardian_of(p_student_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.guardian_portal_account gpa
    join public.student_guardian sg on sg.guardian_id = gpa.guardian_id
    where gpa.auth_user_id = auth.uid() and gpa.status = 'active' and sg.student_id = p_student_id
  )
$$;

comment on function public.fn_is_guardian_of(uuid) is
  'The per-student check every parent-facing table policy below uses. A guardian with a
   revoked/pending/blocked_no_contact guardian_portal_account.status never matches -- only
   status=''active'' (set once the guardian has completed their password-set flow) counts.';

-- ---------------------------------------------------------------------------
-- Foundational: resolving which students a signed-in guardian may see at all.
-- ---------------------------------------------------------------------------
create policy student_guardian_select_parent on public.student_guardian for select to authenticated
  using (exists (
    select 1 from public.guardian_portal_account gpa
    where gpa.auth_user_id = auth.uid() and gpa.status = 'active' and gpa.guardian_id = student_guardian.guardian_id
  ));

create policy student_select_parent on public.student for select to authenticated
  using (public.fn_is_guardian_of(id));

create policy enrollment_select_parent on public.enrollment for select to authenticated
  using (public.fn_is_guardian_of(student_id));

-- ---------------------------------------------------------------------------
-- Attendance view (§L, §E's P2 "parent alerts" reads the same underlying data).
-- ---------------------------------------------------------------------------
create policy attendance_record_select_parent on public.attendance_record for select to authenticated
  using (public.fn_is_guardian_of(student_id));

-- ---------------------------------------------------------------------------
-- Fees: dues, payment history, receipt download.
-- ---------------------------------------------------------------------------
create policy invoice_select_parent on public.invoice for select to authenticated
  using (public.fn_is_guardian_of(student_id));

create policy payment_select_parent on public.payment for select to authenticated
  using (public.fn_is_guardian_of(student_id));

create policy installment_select_parent on public.installment for select to authenticated
  using (public.fn_is_portal_member_of_school(school_id));

-- ---------------------------------------------------------------------------
-- Results & report cards -- gated on exam.status = 'published' at the RLS layer itself (not just
-- filtered in the app), per docs/schoolerp_features.md §G: "Result publishing to parent portal --
-- P2". A parent can never read marks for an exam still in draft/marks_entry/pending_approval/
-- approved, even if a future portal screen forgets to filter by status.
-- ---------------------------------------------------------------------------
create policy exam_select_parent on public.exam for select to authenticated
  using (status = 'published' and public.fn_is_portal_member_of_school(school_id));

create policy exam_subject_select_parent on public.exam_subject for select to authenticated
  using (exists (
    select 1 from public.exam e where e.id = exam_subject.exam_id and e.status = 'published' and public.fn_is_portal_member_of_school(e.school_id)
  ));

create policy mark_select_parent on public.mark for select to authenticated
  using (
    public.fn_is_guardian_of(student_id)
    and exists (
      select 1 from public.exam_subject es join public.exam e on e.id = es.exam_id
      where es.id = mark.exam_subject_id and e.status = 'published'
    )
  );

create policy grade_band_select_parent on public.grade_band for select to authenticated
  using (public.fn_is_portal_member_of_school(school_id));

create policy report_card_settings_select_parent on public.report_card_settings for select to authenticated
  using (public.fn_is_portal_member_of_school(school_id));

-- ---------------------------------------------------------------------------
-- Shared master-data reads needed to render any of the above (class/section names, subject
-- names, academic year labels, the holiday calendar for attendance-percentage math, and the
-- school's own branding for PDF headers).
-- ---------------------------------------------------------------------------
create policy academic_year_select_parent on public.academic_year for select to authenticated
  using (public.fn_is_portal_member_of_school(school_id));
create policy class_select_parent on public.class for select to authenticated
  using (public.fn_is_portal_member_of_school(school_id));
create policy section_select_parent on public.section for select to authenticated
  using (public.fn_is_portal_member_of_school(school_id));
create policy subject_select_parent on public.subject for select to authenticated
  using (public.fn_is_portal_member_of_school(school_id));
create policy holiday_select_parent on public.holiday for select to authenticated
  using (public.fn_is_portal_member_of_school(school_id));
create policy school_select_parent on public.school for select to authenticated
  using (public.fn_is_portal_member_of_school(id));
create policy school_branding_select_parent on public.school_branding for select to authenticated
  using (public.fn_is_portal_member_of_school(school_id));

-- ---------------------------------------------------------------------------
-- Leave application (§L "Leave application"). A parent submits, for their own child only;
-- reviewing/approving is staff, gated by attendance.manage (the same permission that already
-- covers "mark or correct attendance for any section" -- approving a leave is the same class of
-- attendance-affecting decision). Class-teacher-scoped review (only their own section) is a
-- narrower cut of this than attendance.manage grants today and is deliberately not built in this
-- pass -- attendance.manage-holding roles (owner/admin/principal) can already see and act on
-- every request; a class-teacher self-service view is a fast-follow, not a blocker.
-- ---------------------------------------------------------------------------
insert into public.permission (key, label) values
  ('school.review_leave_applications', 'Review and approve/reject parent-submitted leave applications');

insert into public.role_permission (role_id, permission_id)
select r.id, p.id from public.role r, public.permission p
where r.key in ('school_owner', 'school_admin', 'principal') and p.key = 'school.review_leave_applications';

create table public.student_leave_application (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  student_id uuid not null references public.student(id) on delete cascade,
  guardian_id uuid not null references public.guardian(id) on delete cascade,
  from_date date not null,
  to_date date not null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by_auth_user_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (to_date >= from_date)
);

alter table public.student_leave_application enable row level security;

grant select, insert on public.student_leave_application to authenticated;
grant update on public.student_leave_application to authenticated;

create policy student_leave_application_select_parent on public.student_leave_application for select to authenticated
  using (public.fn_is_guardian_of(student_id));
create policy student_leave_application_insert_parent on public.student_leave_application for insert to authenticated
  with check (public.fn_is_guardian_of(student_id));

create policy student_leave_application_select_staff on public.student_leave_application for select to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.review_leave_applications')) or public.is_super_admin());
create policy student_leave_application_update_staff on public.student_leave_application for update to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.review_leave_applications')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.review_leave_applications')) or public.is_super_admin());
