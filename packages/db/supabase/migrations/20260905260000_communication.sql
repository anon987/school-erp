-- P2 Communication (docs/schoolerp_features.md §K): notices/circulars/announcements, targeted at
-- a configurable audience, fanned out into per-recipient/per-channel notification rows a worker
-- job (never inline in the request -- CLAUDE.md) actually dispatches. In-app is the one channel
-- that needs no external provider and is fully live-verified in this pass; SMS/WhatsApp/email go
-- through packages/integrations/src/messaging adapters that are written against each provider's
-- documented API but NOT exercised end-to-end anywhere (no live credentials in this environment
-- -- same disclosed-unverified status as packages/integrations/src/payments/razorpayProvider.ts).
--
-- This migration also gives Attendance's "parent alerts on absence" (§E, P2) and Exams' "result
-- publishing to parent portal" (§G, P2) something to plug into -- the portal read for published
-- results already works (P2 Portal migration); absence alerts are wired to auto-create a notice
-- in this migration's fn_notify_absence, called from the attendance-marking action.

insert into public.permission (key, label) values
  ('school.manage_communication', 'Compose and send notices, circulars, and announcements');

insert into public.role_permission (role_id, permission_id)
select r.id, p.id from public.role r, public.permission p
where r.key in ('school_owner', 'school_admin', 'principal') and p.key = 'school.manage_communication';

-- ---------------------------------------------------------------------------
create table public.notice (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  title text not null,
  body text not null,
  audience_kind text not null check (audience_kind in ('guardians', 'staff')),
  -- Subset of channels this notice goes out on. 'in_app' is free and always available; the
  -- others cost money per send (CLAUDE.md: "Message credits are metered per school"), so the
  -- sender picks them explicitly rather than every notice blasting every channel by default.
  channels text[] not null default array['in_app']::text[],
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by_auth_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check (channels <@ array['in_app', 'sms', 'whatsapp', 'email']::text[])
);

alter table public.notice enable row level security;

grant select, insert on public.notice to authenticated;

create policy notice_select_staff on public.notice for select to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_communication')) or public.is_super_admin());
create policy notice_insert_staff on public.notice for insert to authenticated
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_communication')) or public.is_super_admin());

-- notice_select_guardian_recipient / notice_select_staff_recipient are defined further down,
-- right after the `notification` table they reference is created -- CREATE POLICY validates its
-- USING clause against real catalog objects immediately, so it cannot reference a table that
-- doesn't exist yet.

-- ---------------------------------------------------------------------------
-- scope_id is polymorphic depending on scope_type + the parent notice's audience_kind (class_id/
-- section_id/student_id for 'guardians' audience, role_id/staff auth_user_id for 'staff'
-- audience) -- same "no conditional FK, validate existence in the function that consumes it
-- instead" shape as application_document's document_id, except here fn_publish_notice below is
-- the sole consumer and does the interpretation, so no separate validation trigger is needed --
-- an audience row that resolves to zero recipients is inert, not a data-integrity problem.
create table public.notice_audience (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  notice_id uuid not null references public.notice(id) on delete cascade,
  scope_type text not null check (scope_type in ('whole_school', 'class', 'section', 'role', 'individual')),
  scope_id uuid,
  created_at timestamptz not null default now(),
  check (scope_type = 'whole_school' or scope_id is not null)
);

alter table public.notice_audience enable row level security;

grant select, insert on public.notice_audience to authenticated;

create policy notice_audience_select on public.notice_audience for select to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_communication')) or public.is_super_admin());
create policy notice_audience_insert on public.notice_audience for insert to authenticated
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_communication')) or public.is_super_admin());

-- ---------------------------------------------------------------------------
-- One row per (recipient, channel) this notice actually goes out through -- the fan-out
-- fn_publish_notice below produces. recipient_guardian_id XOR recipient_auth_user_id, enforced
-- by the check constraint, not two nullable-either-way columns with no rule between them.
create table public.notification (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  notice_id uuid not null references public.notice(id) on delete cascade,
  recipient_type text not null check (recipient_type in ('guardian', 'staff')),
  recipient_guardian_id uuid references public.guardian(id) on delete cascade,
  recipient_auth_user_id uuid references auth.users(id) on delete cascade,
  channel text not null check (channel in ('in_app', 'sms', 'whatsapp', 'email')),
  created_at timestamptz not null default now(),
  check (
    (recipient_type = 'guardian' and recipient_guardian_id is not null and recipient_auth_user_id is null)
    or (recipient_type = 'staff' and recipient_auth_user_id is not null and recipient_guardian_id is null)
  )
);

create unique index notification_unique_recipient_channel on public.notification (
  notice_id, recipient_type, channel,
  coalesce(recipient_guardian_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(recipient_auth_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

alter table public.notification enable row level security;

grant select on public.notification to authenticated;

create policy notification_select_staff on public.notification for select to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_communication')) or public.is_super_admin());
create policy notification_select_guardian_recipient on public.notification for select to authenticated
  using (
    recipient_type = 'guardian'
    and exists (select 1 from public.guardian_portal_account gpa where gpa.guardian_id = notification.recipient_guardian_id and gpa.auth_user_id = auth.uid() and gpa.status = 'active')
  );
create policy notification_select_staff_recipient on public.notification for select to authenticated
  using (recipient_type = 'staff' and recipient_auth_user_id = auth.uid());

-- A guardian/staff recipient can read the notice content actually addressed to them, via the
-- notification fan-out -- never the whole school_id-scoped table. Defined here, not up next to
-- notice's other policies, because CREATE POLICY needs `notification` to already exist.
create policy notice_select_guardian_recipient on public.notice for select to authenticated
  using (exists (
    select 1 from public.notification n
    join public.guardian_portal_account gpa on gpa.guardian_id = n.recipient_guardian_id
    where n.notice_id = notice.id and n.recipient_type = 'guardian' and gpa.auth_user_id = auth.uid() and gpa.status = 'active'
  ));
create policy notice_select_staff_recipient on public.notice for select to authenticated
  using (exists (
    select 1 from public.notification n where n.notice_id = notice.id and n.recipient_type = 'staff' and n.recipient_auth_user_id = auth.uid()
  ));

-- No insert/update/delete grant to `authenticated` at all -- every row is produced by
-- fn_publish_notice_internal (SECURITY DEFINER, see below) or, for non-in_app channels, by
-- apps/worker's dispatch job writing notification_delivery, never notification itself after
-- fan-out.

-- ---------------------------------------------------------------------------
-- The outcome of actually dispatching one notification -- provider, status, cost, in one place
-- per CLAUDE.md ("Every send writes a notification_delivery row with provider, status, and
-- cost"). in_app "delivery" is dispatched synchronously by fn_publish_notice itself (status
-- 'delivered', provider 'internal', cost 0) since there is nothing to fail; sms/whatsapp/email
-- rows are written later by apps/worker after it actually calls the provider adapter.
create table public.notification_delivery (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  notification_id uuid not null references public.notification(id) on delete cascade,
  provider text not null check (provider in ('internal', 'msg91', 'gupshup', 'smtp')),
  status text not null check (status in ('sent', 'delivered', 'failed')),
  provider_message_id text,
  cost_paise bigint,
  error_message text,
  created_at timestamptz not null default now(),
  unique (notification_id)
);

alter table public.notification_delivery enable row level security;

grant select on public.notification_delivery to authenticated;

create policy notification_delivery_select_staff on public.notification_delivery for select to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_communication')) or public.is_super_admin());

-- No insert/update/delete grant to `authenticated` -- in_app rows are written by
-- fn_publish_notice_internal (SECURITY DEFINER, see below -- it is the one function allowed to
-- write this table directly); every other channel's delivery row is written by apps/worker's
-- service-role client after actually calling the provider.

-- ---------------------------------------------------------------------------
-- Fans a notice out to its audience: resolves notice_audience's scope rows into concrete
-- (guardian_id | staff auth_user_id) recipients, deduplicated, then creates one `notification`
-- row per recipient per requested channel. In-app is dispatched immediately (a notification_
-- delivery row written right here -- there's no external call that can fail); sms/whatsapp/email
-- are left as notification rows with no delivery row yet, which is exactly what "queued, not yet
-- processed" means -- apps/worker's dispatch job picks those up.
--
-- SECURITY DEFINER (unlike almost everything else in this schema): resolving "every guardian of
-- every student in this class" legitimately needs to read student/enrollment/student_guardian/
-- school_member/role rows the caller may have no direct permission to browse row-by-row; this
-- function is the one place that crosses that seam, and it does so with a fixed, reviewed query,
-- not an arbitrary caller-supplied one.
--
-- Split into a permission-checked public wrapper (fn_publish_notice, below) and this internal
-- version deliberately: fn_notify_absence needs the SAME fan-out but its caller only has
-- attendance.manage/attendance.mark_own_class, not school.manage_communication -- an automated
-- system notice about one student's own absence should not require the human "compose an
-- announcement" permission. This internal version still checks the tenant boundary
-- (current_school_id() = p_school_id) since it's still reachable by name via RPC by any
-- authenticated caller, but leaves the manage_communication check to its callers, each of which
-- proves a DIFFERENT, appropriate authorization before reaching here.
create or replace function public.fn_publish_notice_internal(p_notice_id uuid, p_school_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notice record;
  v_channel text;
  v_current_year_id uuid;
begin
  if not (public.current_school_id() = p_school_id or public.is_super_admin()) then
    raise exception 'Forbidden: % is not the caller''s school', p_school_id;
  end if;

  select * into v_notice from public.notice where id = p_notice_id and school_id = p_school_id for update;
  if not found then
    raise exception 'Notice % not found in school %', p_notice_id, p_school_id;
  end if;
  if v_notice.sent_at is not null then
    raise exception 'Notice % has already been sent', p_notice_id;
  end if;

  select id into v_current_year_id from public.academic_year where school_id = p_school_id and is_current;

  if v_notice.audience_kind = 'guardians' then
    create temporary table _notice_recipient_guardians (guardian_id uuid primary key) on commit drop;

    insert into _notice_recipient_guardians (guardian_id)
    select distinct sg.guardian_id
    from public.notice_audience na
    join public.student s on s.school_id = p_school_id
    join public.student_guardian sg on sg.student_id = s.id
    left join public.enrollment e on e.student_id = s.id and e.academic_year_id = v_current_year_id
    where na.notice_id = p_notice_id
      and (
        na.scope_type = 'whole_school'
        or (na.scope_type = 'class' and e.class_id = na.scope_id)
        or (na.scope_type = 'section' and e.section_id = na.scope_id)
        or (na.scope_type = 'individual' and s.id = na.scope_id)
      )
    on conflict (guardian_id) do nothing;

    foreach v_channel in array v_notice.channels loop
      insert into public.notification (school_id, notice_id, recipient_type, recipient_guardian_id, channel)
      select p_school_id, p_notice_id, 'guardian', guardian_id, v_channel from _notice_recipient_guardians;
    end loop;
  else
    create temporary table _notice_recipient_staff (auth_user_id uuid primary key) on commit drop;

    insert into _notice_recipient_staff (auth_user_id)
    select distinct sm.auth_user_id
    from public.notice_audience na
    join public.school_member sm on sm.school_id = p_school_id and sm.is_active
    left join public.school_member_role smr on smr.school_member_id = sm.id
    where na.notice_id = p_notice_id
      and (
        na.scope_type = 'whole_school'
        or (na.scope_type = 'role' and smr.role_id = na.scope_id)
        or (na.scope_type = 'individual' and sm.auth_user_id = na.scope_id)
      )
    on conflict (auth_user_id) do nothing;

    foreach v_channel in array v_notice.channels loop
      insert into public.notification (school_id, notice_id, recipient_type, recipient_auth_user_id, channel)
      select p_school_id, p_notice_id, 'staff', auth_user_id, v_channel from _notice_recipient_staff;
    end loop;
  end if;

  -- In-app is dispatched synchronously, right here -- free, and there is no external call that
  -- can fail, so there is no reason to make it wait for apps/worker's polling.
  insert into public.notification_delivery (school_id, notification_id, provider, status, cost_paise)
  select p_school_id, n.id, 'internal', 'delivered', 0
  from public.notification n
  where n.notice_id = p_notice_id and n.channel = 'in_app';

  update public.notice set sent_at = now() where id = p_notice_id;
end;
$$;

-- The public, human-composed-notice entry point apps/web's server action calls: same fan-out,
-- plus the school.manage_communication check fn_publish_notice_internal deliberately doesn't do.
create or replace function public.fn_publish_notice(p_notice_id uuid, p_school_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.current_school_id() = p_school_id or public.is_super_admin()) then
    raise exception 'Forbidden: % is not the caller''s school', p_school_id;
  end if;
  if not (public.fn_has_permission(public.current_roles(), 'school.manage_communication') or public.is_super_admin()) then
    raise exception 'Forbidden: missing permission school.manage_communication';
  end if;

  perform public.fn_publish_notice_internal(p_notice_id, p_school_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Attendance's §E "parent alerts on absence" (P2): auto-creates and publishes a one-recipient
-- notice to the absent student's guardians whenever attendance is marked 'absent'. In-app only
-- by default -- see this migration's header comment on why sms/whatsapp cost money and aren't
-- silently turned on for an automated, high-frequency trigger like this one.
create or replace function public.fn_notify_absence(p_school_id uuid, p_student_id uuid, p_attendance_date date, p_marked_by_auth_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notice_id uuid;
  v_student_name text;
begin
  -- Same reasoning as fn_publish_notice's guard: reachable by any authenticated caller via RPC.
  -- Rather than re-deriving attendance_record_write's own "class teacher of THIS section, or
  -- attendance.manage" predicate here (a second copy that could drift from the original), this
  -- checks the FACT the alert is about: an absent record for this exact student/date must
  -- already exist in this school -- which could only have been created by someone who already
  -- passed attendance_record_write's RLS policy. No record, no alert; there is nothing else to
  -- authorize against.
  if not (public.current_school_id() = p_school_id or public.is_super_admin()) then
    raise exception 'Forbidden: % is not the caller''s school', p_school_id;
  end if;
  if not exists (
    select 1 from public.attendance_record
    where school_id = p_school_id and student_id = p_student_id and attendance_date = p_attendance_date and status = 'absent'
  ) then
    raise exception 'No absent attendance_record found for student % on %', p_student_id, p_attendance_date;
  end if;

  select first_name || ' ' || last_name into v_student_name from public.student where id = p_student_id and school_id = p_school_id;
  if v_student_name is null then
    return;
  end if;

  insert into public.notice (school_id, title, body, audience_kind, channels, created_by_auth_user_id)
  values (
    p_school_id,
    'Absence recorded',
    v_student_name || ' was marked absent on ' || to_char(p_attendance_date, 'DD/MM/YYYY') || '.',
    'guardians',
    array['in_app']::text[],
    p_marked_by_auth_user_id
  )
  returning id into v_notice_id;

  insert into public.notice_audience (school_id, notice_id, scope_type, scope_id)
  values (p_school_id, v_notice_id, 'individual', p_student_id);

  perform public.fn_publish_notice_internal(v_notice_id, p_school_id);
end;
$$;

comment on function public.fn_notify_absence is
  'SECURITY DEFINER for the same reason as fn_publish_notice_internal (which it calls directly,
   not the permission-checked fn_publish_notice wrapper) -- the caller
   (attendance.mark_own_class / attendance.manage, checked by the attendance-marking action
   before this is ever invoked) does not need school.manage_communication just to trigger an
   automated system notice.';
