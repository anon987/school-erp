-- Report cards gain the same 5-design gallery Fees receipts already have (lib/core/pdf's shared
-- palette) -- one template key per school, same CHECK values as school_branding.receipt_template.
alter table public.report_card_settings
  add column template text not null default 'classic_bw'
    check (template in ('classic_bw', 'minimal_bw', 'modern_blue', 'emerald_green', 'amber_gold'));

-- ID cards (docs/schoolerp_features.md -- not previously built): one shared settings row per
-- school (a school picks one design, used for both student and staff cards -- not two separate
-- settings screens for what's visually the same choice). Gated by school.manage_master_data:
-- this is general school configuration, not owned by Students or Staff specifically.
create table public.id_card_settings (
  school_id uuid primary key references public.school(id) on delete cascade,
  template text not null default 'classic_bw'
    check (template in ('classic_bw', 'minimal_bw', 'modern_blue', 'emerald_green', 'amber_gold')),
  show_blood_group boolean not null default true,
  show_dob boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_id_card_settings_set_updated_at
  before update on public.id_card_settings
  for each row execute function public.set_updated_at();

alter table public.id_card_settings enable row level security;

grant select, insert, update, delete on public.id_card_settings to authenticated;

create policy id_card_settings_select on public.id_card_settings for select to authenticated
  using (school_id = public.current_school_id() or public.is_super_admin());

create policy id_card_settings_write on public.id_card_settings for all to authenticated
  using ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_master_data')) or public.is_super_admin())
  with check ((school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_master_data')) or public.is_super_admin());

-- Data-model gap found while wiring up ID cards: `staff` has no blood_group column (student
-- does). The confirmed ID card content includes blood group for both card types, so this is a
-- real, needed addition, not scope creep -- flagged explicitly rather than silently shipping a
-- staff ID card field that always shows "--".
alter table public.staff add column blood_group text;
