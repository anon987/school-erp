-- Two disclosed P2 Portal (§L) gaps found on re-audit against docs/schoolerp_features.md, fixed
-- here + in app code:
--   1. Timetable was never surfaced to parents (app-layer only fix -- the RLS for it already
--      existed, added alongside the Timetable module itself; nothing in this migration).
--   2. "Online payment" (§L) was unreachable from the portal: the app UI hid the button for any
--      non-staff caller, and even with that fixed, `payment_insert`'s RLS only allows a caller
--      with school.manage_fees -- a guardian has no school_member row, so current_school_id()/
--      current_roles() are null for them and that check always fails. This adds a second,
--      narrowly-scoped INSERT policy for guardians.
--
-- Deliberately narrow: a guardian may only insert the SAME kind of placeholder row staff create
-- via createRazorpayOrderAction (method='online', status='pending_gateway'), only for an invoice
-- that is genuinely their own child's (fn_is_guardian_of + an explicit invoice/student/school
-- match, not just trusting the payment row's own columns). This does not let a guardian insert a
-- 'recorded'/'captured' row directly -- that still only ever happens via the service-role webhook
-- (apps/worker), preserving CLAUDE.md's "never mark paid from a client-side callback" rule. The
-- table's own CHECK constraint (payment_online_starts_pending_gateway) already backstops this.
create policy payment_insert_parent on public.payment for insert to authenticated
  with check (
    method = 'online'
    and status = 'pending_gateway'
    and public.fn_is_guardian_of(student_id)
    and exists (
      select 1 from public.invoice i
      where i.id = payment.invoice_id and i.student_id = payment.student_id and i.school_id = payment.school_id
    )
  );
