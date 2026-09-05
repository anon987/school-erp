import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@schoolerp/types";
import { publicEnv } from "../env";

/**
 * The RN-appropriate equivalent of apps/web/src/lib/core/supabase/server.ts's
 * createSupabaseServerClient -- `@supabase/supabase-js` directly (NOT `@supabase/ssr`, which is
 * Next.js-specific), session persisted via AsyncStorage instead of cookies. This is the ONLY
 * Supabase client in the app: every query (guardian portal reads AND teacher attendance writes)
 * goes through this one client, authenticated as the signed-in user, relying entirely on the
 * same RLS policies apps/web relies on. It never holds the service-role key.
 *
 * `autoRefreshToken`/`persistSession` mirror the web client's cookie-refresh behaviour; `detectSessionInUrl:
 * false` because there is no browser URL to inspect on a native client (the invite-link flow, when
 * built, will hand this client a token_hash to exchange explicitly via verifyOtp, not rely on URL
 * parsing).
 */
export const supabase = createClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
