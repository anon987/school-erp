import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@schoolerp/types";

/**
 * The set of login methods the product supports. P0 implements only "email_password".
 * "phone_otp" is a real member of this union (not an afterthought bolted on later) because the
 * eventual default for parents, and likely most staff, is phone + OTP -- see
 * PhoneOtpStrategy for why it is stubbed rather than omitted.
 */
export type AuthMethod = "email_password" | "phone_otp";

export interface AuthCredentialsByMethod {
  email_password: { email: string; password: string };
  phone_otp: { phone: string; otp: string };
}

export interface AuthSignInResult {
  ok: boolean;
  errorMessage?: string;
}

/**
 * A login method, decoupled from any specific component or server action. Callers resolve
 * which strategy applies via resolveAuthMethod and then call signIn on it -- no component ever
 * hardcodes "email + password" as *the* way to log in.
 */
export interface AuthStrategy<M extends AuthMethod> {
  readonly method: M;
  signIn(client: SupabaseClient<Database>, credentials: AuthCredentialsByMethod[M]): Promise<AuthSignInResult>;
}
