import { cookies } from "next/headers";
import {
  isResolvedTheme,
  isThemePreference,
  THEME_PREFERENCE_COOKIE,
  THEME_RESOLVED_COOKIE,
  type ResolvedTheme,
} from "./constants";

/**
 * Server-side theme resolution for the root layout. Runs before anything is sent to the
 * browser, so whatever it returns is what paints first -- no flash.
 *
 * "system" preference is resolved using the LAST client-observed matchMedia result (the
 * theme-resolved cookie), not guessed as "light" -- see the inline script in root layout.tsx
 * for how that cookie gets set. Only a user's very first ever visit (no cookie yet) can't be
 * resolved server-side; that one case is covered by the same inline script running
 * synchronously before paint.
 */
export async function resolveServerTheme(): Promise<ResolvedTheme> {
  const cookieStore = await cookies();
  const preference = cookieStore.get(THEME_PREFERENCE_COOKIE)?.value;
  const resolved = cookieStore.get(THEME_RESOLVED_COOKIE)?.value;

  if (isThemePreference(preference) && preference !== "system") {
    return preference;
  }
  if (isResolvedTheme(resolved)) {
    return resolved;
  }
  return "light";
}
