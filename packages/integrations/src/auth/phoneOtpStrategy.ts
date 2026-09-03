import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@schoolerp/types";
import type { AuthCredentialsByMethod, AuthSignInResult, AuthStrategy } from "./types";

/**
 * Not wired up in P0: real OTP delivery needs the MSG91 adapter, which is P1 messaging
 * infrastructure (docs/schoolerp_techstack.md §5), and Supabase's phone-auth SMS provider hook
 * needs to be pointed at it. This stub exists so the strategy interface, and everything that
 * calls resolveAuthMethod, is already shaped for phone+OTP -- switching it on later is wiring
 * a provider, not redesigning login.
 */
export const phoneOtpStrategy: AuthStrategy<"phone_otp"> = {
  method: "phone_otp",
  async signIn(
    _client: SupabaseClient<Database>,
    _credentials: AuthCredentialsByMethod["phone_otp"],
  ): Promise<AuthSignInResult> {
    return {
      ok: false,
      errorMessage: "Phone + OTP sign-in is not yet available. Use email and password.",
    };
  },
};
