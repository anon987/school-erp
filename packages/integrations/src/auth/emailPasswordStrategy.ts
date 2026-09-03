import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@schoolerp/types";
import type { AuthCredentialsByMethod, AuthSignInResult, AuthStrategy } from "./types";

/**
 * P0's only live strategy. Supabase Auth email/password -- a development and testing
 * convenience, not the final auth design. See resolveAuthMethod for why the calling code never
 * assumes this is the only path.
 */
export const emailPasswordStrategy: AuthStrategy<"email_password"> = {
  method: "email_password",
  async signIn(
    client: SupabaseClient<Database>,
    credentials: AuthCredentialsByMethod["email_password"],
  ): Promise<AuthSignInResult> {
    const { error } = await client.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      return { ok: false, errorMessage: error.message };
    }
    return { ok: true };
  },
};
