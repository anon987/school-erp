-- Fix: fn_list_fk_dependents returned zero rows for the `authenticated` role even though the
-- FKs genuinely exist. Root cause: information_schema.table_constraints/key_column_usage/
-- constraint_column_usage gate visibility on the querying role having REFERENCES privilege on
-- the underlying table (among other checks) -- SELECT/INSERT/UPDATE/DELETE, which
-- `authenticated` does have, isn't enough. Granting REFERENCES broadly to `authenticated` just
-- to satisfy an introspection query would be a stranger, broader permission than the actual
-- need.
--
-- This function returns schema metadata only (table/column names) -- identical for every
-- caller regardless of school, never a row of tenant data -- so SECURITY DEFINER here carries
-- none of the risk it would on a function touching student/staff/school_member data (see the
-- revert function, which is deliberately SECURITY INVOKER for exactly that reason). `set
-- search_path = public` is the standard guard against search_path hijacking in a DEFINER
-- function.
create or replace function public.fn_list_fk_dependents(p_target_tables text[])
returns table (entity_table text, dependent_table text, fk_column text)
language sql
stable
security definer
set search_path = public
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
