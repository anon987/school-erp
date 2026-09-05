-- 20260905050000 added a p_class_id parameter to fn_count_uninvoiced_students and
-- fn_generate_yearly_invoices by using CREATE OR REPLACE with a different argument count.
-- Postgres does not treat that as replacing the existing function -- a different arity is a
-- distinct overload, so the old 2-arg / 4-arg versions kept existing alongside the new ones.
-- PostgREST then can't resolve a named-parameter RPC call that matches both via defaults:
-- "Could not choose the best candidate function between: ...(p_after_student_id, p_limit),
-- ...(p_after_student_id, p_limit, p_class_id)". Confirmed live via a direct RPC call before
-- writing this fix. Drop the stale narrower overloads so each function name resolves uniquely
-- again.

drop function if exists public.fn_count_uninvoiced_students(uuid, uuid);
drop function if exists public.fn_generate_yearly_invoices(uuid, uuid, uuid, int);
