-- Receipt template + watermark preference. Extends school_branding rather than a new table
-- (this is a per-school visual-identity setting, same conceptual bucket as logo/colors already
-- on this table) -- confirmed with the user as the simpler option over a dedicated table.
--
-- Deliberately still gated by school.manage_branding (school_branding's existing RLS write
-- policy, unchanged here) even though it's edited from the Fees Setup page for discoverability:
-- school.manage_fees is also granted to the accountant role, and an accountant should not be
-- able to change the school's branding identity via this table just because the control happens
-- to live on a Fees screen. The Fees Setup page checks school.manage_branding itself before
-- showing this section, and the server action re-checks it -- the RLS policy doesn't need to
-- change to accommodate this.
alter table public.school_branding
  add column receipt_template text not null default 'classic_bw'
    check (receipt_template in ('classic_bw', 'minimal_bw', 'modern_blue', 'emerald_green', 'amber_gold')),
  add column receipt_watermark_enabled boolean not null default false;
