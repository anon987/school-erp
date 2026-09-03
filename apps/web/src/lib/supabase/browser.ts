import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";

/**
 * For Client Components only (e.g. the login form). Server code uses createSupabaseServerClient.
 * Not typed with `Database` yet -- see the comment in apps/worker/src/supabaseAdmin.ts.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(supabaseEnv.NEXT_PUBLIC_SUPABASE_URL, supabaseEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
