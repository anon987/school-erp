-- P1 Students & Staff, part 6: documents (photos, ID proofs, certificates) for both students
-- and staff. One private bucket, path-scoped by school and owner, not a public bucket and not
-- one bucket per entity type -- per CLAUDE.md: "Documents go in private storage with signed
-- URLs. Never public buckets for student records."
--
-- Path convention: {school_id}/{owner_type}/{owner_id}/{document_id}-{original_filename}
-- The school_id segment is what storage RLS checks against the caller's JWT -- exactly the
-- same isolation pattern as every table policy, just applied to a path instead of a column.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  10485760, -- 10 MiB per file; well under config.toml's global 50MiB default
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

create table public.document (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school(id) on delete cascade,
  owner_type text not null check (owner_type in ('student', 'staff')),
  owner_id uuid not null,
  category text not null check (category in ('photo', 'id_proof', 'certificate', 'other')),
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null,
  uploaded_by_auth_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

comment on column public.document.owner_id is
  'Polymorphic reference to student.id or staff.id depending on owner_type -- Postgres has no
   conditional FK, so existence is enforced by the trigger below instead.';

create or replace function public.fn_validate_document_owner()
returns trigger
language plpgsql
as $$
declare
  v_exists boolean;
begin
  if new.owner_type = 'student' then
    select exists(
      select 1 from public.student where id = new.owner_id and school_id = new.school_id
    ) into v_exists;
  elsif new.owner_type = 'staff' then
    select exists(
      select 1 from public.staff where id = new.owner_id and school_id = new.school_id
    ) into v_exists;
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

create trigger trg_document_validate_owner
  before insert or update on public.document
  for each row execute function public.fn_validate_document_owner();

alter table public.document enable row level security;

grant select, insert, delete on public.document to authenticated;

create policy document_select on public.document for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());

create policy document_insert on public.document for insert to authenticated
  with check (
    (
      school_id = public.current_school_id()
      and (
        (owner_type = 'student' and public.fn_has_permission(public.current_roles(), 'school.manage_students'))
        or (owner_type = 'staff' and public.fn_has_permission(public.current_roles(), 'school.manage_staff'))
      )
    )
    or public.is_super_admin()
  );

create policy document_delete on public.document for delete to authenticated
  using (
    (
      school_id = public.current_school_id()
      and (
        (owner_type = 'student' and public.fn_has_permission(public.current_roles(), 'school.manage_students'))
        or (owner_type = 'staff' and public.fn_has_permission(public.current_roles(), 'school.manage_staff'))
      )
    )
    or public.is_super_admin()
  );

-- ---------------------------------------------------------------------------
-- storage.objects RLS -- the actual file bytes, separate from the document metadata row above.
-- Path segments: [1]=school_id [2]=owner_type [3]=owner_id [4]=filename.
-- ---------------------------------------------------------------------------
create policy documents_bucket_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and (public.is_super_admin() or (storage.foldername(name))[1] = public.current_school_id()::text)
  );

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
        )
      )
    )
  );

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
        )
      )
    )
  );

comment on policy documents_bucket_select on storage.objects is
  'storage.foldername(name) splits the object path into an array of folder segments -- this is
   the Supabase-documented way to scope storage RLS by path, same idea as splitting on "/"
   manually but handles edge cases (trailing slashes etc.) correctly.';
