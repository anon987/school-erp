"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { emailPasswordStrategy } from "@schoolerp/integrations";
import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import { getSession } from "./session";
import { t } from "@/lib/core/i18n";
import { THEME_PREFERENCE_COOKIE, isThemePreference } from "@/lib/core/theme/constants";

// TODO(types): replace with the generated Row type for user_profile once
// packages/types/src/database.ts is regenerated. See that file's header.
interface ThemePreferenceRow {
  theme_preference: string;
}

export interface SignInState {
  error?: string;
}

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function signInAction(_prevState: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: t("auth.login.error") };
  }

  const supabase = await createSupabaseServerClient();
  const result = await emailPasswordStrategy.signIn(supabase, parsed.data);

  if (!result.ok) {
    return { error: t("auth.login.error") };
  }

  // Sync the user's stored preference (docs/schoolerp_features.md §A2: "persists across
  // sessions and devices") onto THIS device's cookie, so a dark-mode choice made on a phone
  // shows up immediately after signing in on a desktop, instead of waiting for the (app)
  // layout's next render to notice.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data } = await supabase
      .from("user_profile")
      .select("theme_preference")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    const preference = (data as unknown as ThemePreferenceRow | null)?.theme_preference;
    if (isThemePreference(preference)) {
      const cookieStore = await cookies();
      cookieStore.set(THEME_PREFERENCE_COOKIE, preference, { path: "/", maxAge: 60 * 60 * 24 * 400 });
    }
  }

  // Successful sign-ins only for now -- see login_history's migration comment for why
  // failed-attempt tracking is deferred (needs a service-role write path, not this
  // caller-authenticated one). Best-effort: a write failure here must never block sign-in.
  const appSession = await getSession();
  if (appSession) {
    await supabase.from("login_history").insert({ auth_user_id: appSession.authUserId, school_id: appSession.schoolId ?? null });
  }

  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
