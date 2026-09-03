-- Indexes found missing while checking directory query performance at volume
-- (packages/db/tests/directory-pagination.test.ts). student(school_id, admission_number) and
-- staff(school_id, employee_code) already exist as unique constraints and cover school_id-only
-- lookups via leftmost-prefix -- no new index needed there. These four access patterns had no
-- supporting index at all:
--
-- 1. The student directory's class/section filter (enrollment has no index covering class_id/
--    section_id -- its only unique constraint is keyed on student_id, not class_id/section_id).
create index enrollment_school_year_class_section_idx
  on public.enrollment (school_id, academic_year_id, class_id, section_id);

-- 2. guardian has NO index beyond its primary key -- every guardian query, including the RLS
--    policy's own school_id filter, would sequentially scan the whole cross-tenant table as it
--    grows.
create index guardian_school_id_idx on public.guardian (school_id);

-- 3. Looking up all documents for a specific student/staff record (owner_type, owner_id),
--    tenant-scoped.
create index document_owner_idx on public.document (school_id, owner_type, owner_id);

-- 4. student_guardian's primary key is (student_id, guardian_id) -- "this student's guardians"
--    is covered by leftmost-prefix, but "this guardian's student links" (used by
--    fn_revert_import_batch's external-link check, see the import_revert migration) is not.
create index student_guardian_guardian_id_idx on public.student_guardian (guardian_id);
