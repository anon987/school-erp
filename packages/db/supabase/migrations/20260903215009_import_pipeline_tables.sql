-- P1 Students & Staff, part 8: import staging tables.
--
-- No new permission key -- import write access reuses school.manage_students /
-- school.manage_staff depending on import_batch.entity_type, exactly like every other student/
-- staff mutation. A second, parallel "who can import" permission would be a second
-- implementation of the same authorization question.
--
-- match_mode is the answer to "what identifies 'this is the same student' on re-import":
-- 'admission_number' / 'employee_code' match against the school's existing records (a missing
-- or duplicated value in the source file rejects that row rather than silently creating a
-- duplicate); 'none' always creates, for a school whose paper records don't have clean numbers
-- yet -- admission_number/employee_code get auto-assigned via fn_next_school_number.
--
-- Guardians are NOT a separate import entity_type -- they're columns embedded in the student
-- row (guardian1_*, guardian2_*), matching how a paper register actually looks. See the commit
-- function for the (deliberately bounded) guardian-matching rule.
create table public.import_batch (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  entity_type text not null check (entity_type in ('student', 'staff')),
  match_mode text not null check (match_mode in ('admission_number', 'employee_code', 'none')),
  file_name text not null,
  uploaded_by_auth_user_id uuid not null references auth.users(id),
  is_dry_run boolean not null default false,
  status text not null default 'staged' check (status in ('staged', 'validated', 'committed', 'reverted')),
  total_rows int not null default 0,
  created_count int not null default 0,
  updated_count int not null default 0,
  rejected_count int not null default 0,
  committed_at timestamptz,
  reverted_at timestamptz,
  reverted_by_auth_user_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint import_batch_match_mode_matches_entity check (
    (entity_type = 'student' and match_mode in ('admission_number', 'none'))
    or (entity_type = 'staff' and match_mode in ('employee_code', 'none'))
  )
);

alter table public.import_batch enable row level security;

create table public.import_row (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.import_batch(id) on delete cascade,
  row_number int not null,
  raw_data jsonb not null,
  mapped_data jsonb not null,
  validation_status text not null default 'pending' check (validation_status in ('pending', 'valid', 'rejected')),
  rejection_reason text,
  action text check (action in ('create', 'update', 'skip')),
  entity_id uuid,
  previous_data jsonb,
  created_at timestamptz not null default now(),
  unique (batch_id, row_number)
);

comment on column public.import_row.previous_data is
  'Full snapshot of the row as it was immediately before this import applied an update. This is
   a PII shadow copy (guardian phone numbers, addresses) that exists ONLY to make revert
   possible -- it is nulled out once the 7-day revert window closes by
   fn_purge_expired_import_snapshots (scheduled via pg_cron), not kept indefinitely. See the
   revert migration.';

alter table public.import_row enable row level security;

-- Resolve the forward references deferred from the student/staff migrations.
alter table public.student add column created_by_import_batch_id uuid references public.import_batch(id) on delete set null;
alter table public.staff add column created_by_import_batch_id uuid references public.import_batch(id) on delete set null;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
grant select, insert, update on public.import_batch to authenticated;
grant select, insert, update on public.import_row to authenticated;

create policy import_batch_select on public.import_batch for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());

create policy import_batch_insert on public.import_batch for insert to authenticated
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

-- Update is needed for status transitions (staged -> validated -> committed -> reverted), driven
-- by the fn_validate_/fn_commit_/fn_revert_ functions running SECURITY INVOKER as this same
-- caller -- so this policy IS the authorization boundary for those functions' writes to this
-- table, not a formality.
create policy import_batch_update on public.import_batch for update to authenticated
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

create policy import_row_select on public.import_row for select to authenticated
  using (
    exists (
      select 1 from public.import_batch b
      where b.id = import_row.batch_id and (b.school_id = public.current_school_id() or public.is_super_admin())
    )
  );

create policy import_row_insert on public.import_row for insert to authenticated
  with check (
    exists (
      select 1 from public.import_batch b
      where b.id = import_row.batch_id
        and (
          (
            b.school_id = public.current_school_id()
            and (
              (b.entity_type = 'student' and public.fn_has_permission(public.current_roles(), 'school.manage_students'))
              or (b.entity_type = 'staff' and public.fn_has_permission(public.current_roles(), 'school.manage_staff'))
            )
          )
          or public.is_super_admin()
        )
    )
  );

create policy import_row_update on public.import_row for update to authenticated
  using (
    exists (
      select 1 from public.import_batch b
      where b.id = import_row.batch_id
        and (
          (
            b.school_id = public.current_school_id()
            and (
              (b.entity_type = 'student' and public.fn_has_permission(public.current_roles(), 'school.manage_students'))
              or (b.entity_type = 'staff' and public.fn_has_permission(public.current_roles(), 'school.manage_staff'))
            )
          )
          or public.is_super_admin()
        )
    )
  );
