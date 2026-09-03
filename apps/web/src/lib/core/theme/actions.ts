"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { createSupabaseServerClient } from "../supabase/server";
import { getSession } from "../auth/session";
import { THEME_PREFERENCE_COOKIE, THEME_RESOLVED_COOKIE, type ThemePreference } from "./constants";

const preferenceSchema = z.enum(["light", "dark", "system"]);

/**
 * Persists the preference against the USER (docs/schoolerp_features.md §A2: "stored against
 * the user, not the browser"), not just a cookie -- so it follows them to a different device.
 * The cookie is still set here too, for zero-flash on THIS device's next request; the DB row is
 * what makes it show up correctly on a different device/browser after sign-in (see
 * app/login/actions.ts, which reads this same column right after a successful sign-in).
 */
export async function setThemePreference(preference: ThemePreference): Promise<void> {
  const parsed = preferenceSchema.parse(preference);
  const cookieStore = await cookies();

  cookieStore.set(THEME_PREFERENCE_COOKIE, parsed, { path: "/", maxAge: 60 * 60 * 24 * 400 });
  if (parsed !== "system") {
    cookieStore.set(THEME_RESOLVED_COOKIE, parsed, { path: "/", maxAge: 60 * 60 * 24 * 400 });
  }

  const session = await getSession();
  if (!session) return;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("user_profile")
    .update({ theme_preference: parsed })
    .eq("auth_user_id", session.authUserId);
  if (error) throw error;
}
