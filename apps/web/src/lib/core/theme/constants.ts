export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

/** The stored preference: light / dark / system (docs/schoolerp_features.md §A2). */
export const THEME_PREFERENCE_COOKIE = "theme-preference";
/**
 * The last-known resolved value for "system" mode, written by the client-side script in the
 * root layout whenever it reads matchMedia. Letting the SERVER read this on the next request is
 * what makes "system" mode flash-free after the first visit -- without it, every request would
 * render a guess and then possibly correct itself client-side, which is exactly the flash we're
 * avoiding.
 */
export const THEME_RESOLVED_COOKIE = "theme-resolved";

export function isThemePreference(value: string | undefined): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function isResolvedTheme(value: string | undefined): value is ResolvedTheme {
  return value === "light" || value === "dark";
}
