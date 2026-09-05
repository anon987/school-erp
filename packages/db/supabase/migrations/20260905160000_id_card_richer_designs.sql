-- ID cards, richer designs: replaces the single shared `template` (borrowed from the receipt/
-- report-card palette) with an ID-card-specific 8-design gallery, chosen independently per card
-- type (a school may want a playful design for students and a plainer one for staff), plus a
-- shared orientation toggle (CR80 landscape vs portrait) and toggles for the newly-added fields
-- (father/mother name, address, contact phone) modeled on real school ID card designs.
--
-- Address is a genuinely new column -- `student` never collected one. Aadhaar/government ID
-- numbers, also common on real school ID cards, are deliberately NOT added: the Aadhaar Act's
-- restrictions on private-entity collection/display of Aadhaar numbers make this a compliance
-- decision for the school/product owner to make explicitly, not something to add to the schema
-- by default (same reasoning as the earlier decision not to add a religion field).

alter table public.student add column address text;

alter table public.id_card_settings
  add column student_template text,
  add column staff_template text,
  add column orientation text not null default 'horizontal' check (orientation in ('horizontal', 'vertical')),
  add column show_father_name boolean not null default true,
  add column show_mother_name boolean not null default false,
  add column show_address boolean not null default true,
  add column show_contact boolean not null default true;

update public.id_card_settings set
  student_template = case template
    when 'classic_bw' then 'classic_frame'
    when 'minimal_bw' then 'minimal_line'
    when 'modern_blue' then 'azure_band'
    when 'emerald_green' then 'emerald_band'
    when 'amber_gold' then 'golden_badge'
    else 'classic_frame'
  end,
  staff_template = case template
    when 'classic_bw' then 'classic_frame'
    when 'minimal_bw' then 'minimal_line'
    when 'modern_blue' then 'azure_band'
    when 'emerald_green' then 'emerald_band'
    when 'amber_gold' then 'golden_badge'
    else 'classic_frame'
  end;

alter table public.id_card_settings
  alter column student_template set not null,
  alter column student_template set default 'classic_frame',
  add constraint id_card_settings_student_template_check
    check (student_template in ('classic_frame', 'minimal_line', 'azure_band', 'emerald_band', 'sunrise_diagonal', 'crimson_wave', 'royal_arch', 'golden_badge')),
  alter column staff_template set not null,
  alter column staff_template set default 'classic_frame',
  add constraint id_card_settings_staff_template_check
    check (staff_template in ('classic_frame', 'minimal_line', 'azure_band', 'emerald_band', 'sunrise_diagonal', 'crimson_wave', 'royal_arch', 'golden_badge'));

alter table public.id_card_settings drop column template;
