-- Grant execute to `authenticated` for testability (packages/db/tests/import-snapshot-purge.test.ts
-- calls this directly). Safe to expose broadly despite having no per-school scoping: the
-- function only nulls previous_data for batches already past their 7-day retention cutoff --
-- the WHERE clause enforces that regardless of caller, so calling it early has no effect on
-- non-expired rows, exposes no data, and can't corrupt operational data. There is no
-- confidentiality or integrity impact from any caller triggering an early sweep of data that
-- was going to be purged anyway.
grant execute on function public.fn_purge_expired_import_snapshots() to authenticated;
