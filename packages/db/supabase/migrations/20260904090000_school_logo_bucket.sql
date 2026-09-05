-- Public storage bucket for school logos, separate from the private `documents` bucket
-- (20260903214111_documents.sql, "Documents go in private storage with signed URLs. Never
-- public buckets for student records.") -- a logo is the opposite case: it renders in the header
-- on every authenticated page and needs to be reachable via a plain public URL with no signed-URL
-- round trip, and it is not a student/staff record, so the private-bucket rule doesn't apply to it.
--
-- One object per school, overwritten in place (`upsert: true` from the app) rather than
-- accumulating one object per upload -- `school_branding.logo_url` (P0) stores a single URL, not
-- a history, so there is nothing to gain from keeping old logo files around, unlike `document`
-- (photos, ID proofs) which is deliberately an append-only log.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'school-logos',
  'school-logos',
  true,
  2097152, -- 2 MiB -- a logo is a small raster/vector image, not a scanned document
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
on conflict (id) do nothing;

-- Select needs no school-scoping: this bucket is public by design (docs/design-system.md's
-- header shows every school's logo to that school's own users only in practice, but the object
-- itself is already reachable unauthenticated via Storage's public-URL route regardless of any
-- RLS policy here -- scoping select would be security theater, not real protection).
create policy school_logos_bucket_select on storage.objects
  for select to public
  using (bucket_id = 'school-logos');

-- Write is scoped exactly like the documents bucket: path segment [1] must be the caller's own
-- school_id, gated by the same permission the school_branding table itself requires.
-- Path convention: {school_id}/logo.{ext}
create policy school_logos_bucket_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'school-logos'
    and (
      public.is_super_admin()
      or (
        (storage.foldername(name))[1] = public.current_school_id()::text
        and public.fn_has_permission(public.current_roles(), 'school.manage_branding')
      )
    )
  );

-- Needed alongside insert: `upsert: true` on an existing path issues an UPDATE, not an INSERT.
create policy school_logos_bucket_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'school-logos'
    and (
      public.is_super_admin()
      or (
        (storage.foldername(name))[1] = public.current_school_id()::text
        and public.fn_has_permission(public.current_roles(), 'school.manage_branding')
      )
    )
  );

create policy school_logos_bucket_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'school-logos'
    and (
      public.is_super_admin()
      or (
        (storage.foldername(name))[1] = public.current_school_id()::text
        and public.fn_has_permission(public.current_roles(), 'school.manage_branding')
      )
    )
  );
