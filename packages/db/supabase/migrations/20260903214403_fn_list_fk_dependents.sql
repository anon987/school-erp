-- Schema-introspection helper backing the import-revert-registry drift test
-- (packages/db/tests/import-revert-registry-drift.test.ts). PostgREST doesn't expose
-- information_schema directly, so the test needs an RPC to query it. This is metadata only
-- (table/column names), not row data, and it's a permanent safety mechanism, not a throwaway
-- test script -- it belongs in the schema.
create or replace function public.fn_list_fk_dependents(p_target_tables text[])
returns table (entity_table text, dependent_table text, fk_column text)
language sql
stable
as $$
  select ccu.table_name::text, tc.table_name::text, kcu.column_name::text
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
  join information_schema.constraint_column_usage ccu
    on tc.constraint_name = ccu.constraint_name and tc.table_schema = ccu.table_schema
  where tc.constraint_type = 'FOREIGN KEY'
    and tc.table_schema = 'public'
    and ccu.table_name = any(p_target_tables)
$$;

grant execute on function public.fn_list_fk_dependents(text[]) to authenticated;
