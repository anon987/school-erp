"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { emailPasswordStrategy } from "@schoolerp/integrations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { t } from "@/lib/i18n";
import { THEME_PREFERENCE_COOKIE, isThemePreference } from "@/lib/theme/constants";

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

  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
