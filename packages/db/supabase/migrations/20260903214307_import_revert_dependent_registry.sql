-- P1 Students & Staff, part 7: the import-revert dependent registry.
--
-- Import revert needs to know, for each importable entity (student, staff), every other table
-- that can reference it -- some are "part of the same unit" (enrollment, student_guardian,
-- document: created together, safe to remove together), some are genuinely independent
-- operational work (a class-teacher appointment, a teaching assignment) that must BLOCK revert
-- rather than be silently deleted. A `// TODO: add attendance/fees checks here later` comment
-- in the revert function would not survive to the week attendance actually lands -- this table
-- is the alternative: it's what the revert function reads, AND what a test
-- (packages/db/tests/import-revert-registry-drift.test.ts) checks against the database's
-- actual foreign keys. A new table with an FK to student/staff that isn't registered here
-- fails that test, not silently ships a revert with a gap.
--
-- has_real_fk distinguishes "the database's own FK constraint already cascades this
-- automatically on delete" (enrollment, student_guardian) from "no real FK exists (a
-- polymorphic column), the revert function must clean this up explicitly" (document -- see its
-- migration's comment on why it can't have a normal FK). The drift test can only discover real
-- FKs; polymorphic dependents must be registered by hand, same as this one currently is.
--
-- special_cased marks the one relationship (guardian -> student_guardian) that isn't a simple
-- existence check: a guardian's own creation link is itself a student_guardian row, so "does a
-- student_guardian row exist" would always be true and block every guardian revert. Its actual
-- check -- "does a link exist to a student OUTSIDE this batch" -- is batch-relative and lives
-- as bespoke logic in fn_revert_import_batch, not this generic mechanism. The drift test only
-- requires that the pair is REGISTERED, not that it fits the simple boolean model.
create table public.import_revert_dependent_registry (
  entity_table text not null,
  dependent_table text not null,
  fk_column text not null,
  has_real_fk boolean not null,
  special_cased boolean not null default false,
  blocks_revert boolean,
  note text not null,
  primary key (entity_table, dependent_table),
  constraint import_revert_dependent_registry_blocks_revert_shape check (
    (special_cased and blocks_revert is null) or (not special_cased and blocks_revert is not null)
  )
);

alter table public.import_revert_dependent_registry enable row level security;

grant select on public.import_revert_dependent_registry to authenticated;
create policy import_revert_dependent_registry_read on public.import_revert_dependent_registry
  for select to authenticated using (true);

comment on table public.import_revert_dependent_registry is
  'Platform-wide reference data (like role/permission), not school-scoped. Writable only via
   migration -- adding a row here is a code-review-visible act, which is the point.';

insert into public.import_revert_dependent_registry
  (entity_table, dependent_table, fk_column, has_real_fk, special_cased, blocks_revert, note)
values
  ('student', 'enrollment', 'student_id', true, false, false,
    'Created together by the same import unit; FK cascade deletes it automatically on student delete.'),
  ('student', 'student_guardian', 'student_id', true, false, false,
    'Created together by the same import unit; FK cascade deletes it automatically on student delete.'),
  ('student', 'document', 'owner_id', false, false, false,
    'Created together (e.g. a photo at admission); polymorphic column, no real FK -- the revert function deletes these explicitly.'),
  ('staff', 'staff_qualification', 'staff_id', true, false, false,
    'Created together by the same import unit; FK cascade deletes it automatically on staff delete.'),
  ('staff', 'staff_class_subject', 'staff_id', true, false, true,
    'A real teaching-assignment decision, commonly made after import -- block revert rather than silently remove it.'),
  ('staff', 'section', 'class_teacher_staff_id', true, false, true,
    'A real class-teacher appointment -- block revert rather than silently remove it.'),
  ('staff', 'document', 'owner_id', false, false, false,
    'Created together; polymorphic column, no real FK -- the revert function deletes these explicitly.'),
  ('guardian', 'student_guardian', 'guardian_id', true, true, null,
    'Batch-relative check (external student link?), not a simple existence check -- see fn_revert_import_batch.');
