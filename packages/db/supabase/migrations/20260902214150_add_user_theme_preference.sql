-- A2. Appearance & user preferences (P0): dark mode is a per-USER preference, not a browser
-- setting, so it follows a person across devices (docs/schoolerp_features.md §A2). Lives on
-- user_profile, the global identity table, not on school_member -- the preference isn't
-- school-specific.
alter table public.user_profile
  add column theme_preference text not null default 'system'
  constraint user_profile_theme_preference_check check (theme_preference in ('light', 'dark', 'system'));
