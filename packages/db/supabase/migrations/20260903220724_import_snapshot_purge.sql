-- P1 Students & Staff, part 12: purging the previous_data PII shadow copy.
--
-- previous_data (see import_pipeline_tables migration) is a full row snapshot -- guardian
-- phone numbers, addresses -- kept ONLY so revert can restore an update within its 7-day
-- window. Keeping it indefinitely is a second copy of student PII outside the main tables,
-- against "minimise collected data" (docs/schoolerp_features.md §6) and awkward under DPDPA.
--
-- pg_cron (DB-native scheduling, no new application job-queue infra) runs this daily. Not
-- granted to `authenticated` -- it has no per-school scoping (it's a global maintenance sweep
-- across every school's overdue batches at once, which is correct for what it does but not
-- something an end user should be able to trigger directly); it runs as the scheduler's role,
-- and is exercised directly by tests via a service connection.
create or replace function public.fn_purge_expired_import_snapshots()
returns void
language sql
as $$
  update public.import_row
  set previous_data = null
  where previous_data is not null
    and batch_id in (
      select id from public.import_batch
      where committed_at is not null and committed_at < now() - interval '7 days'
    );
$$;

comment on function public.fn_purge_expired_import_snapshots() is
  'Scheduled daily via pg_cron (see cron.schedule below). Tested directly in
   packages/db/tests/import-snapshot-purge.test.ts by backdating a batch''s committed_at and
   asserting previous_data is nulled, and that a recent batch''s previous_data survives.';

-- pg_cron manages its own `cron` schema (job table, job_run_details, the schedule() function)
-- regardless of any SCHEMA clause here -- this is standard, documented behavior, not an
-- omission.
create extension if not exists pg_cron;

select cron.schedule(
  'purge-expired-import-snapshots',
  '0 3 * * *',
  $$select public.fn_purge_expired_import_snapshots();$$
);
