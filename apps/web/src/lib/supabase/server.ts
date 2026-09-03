import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@schoolerp/types";
import { supabaseEnv } from "./env";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * The server-side client, scoped to the anon key + the caller's own session cookies. This is
 * how every server component, server action, and route handler in this app talks to
 * Supabase -- it goes through RLS as the signed-in user, never bypassing it. The service-role
 * client (apps/worker only) is a different, deliberately separate code path.
 *
 * Typed with the real generated `Database` (see packages/types/src/database.ts) -- P0 briefly
 * ran untyped because the placeholder shape broke supabase-js's insert/upsert generics; that's
 * resolved now that `pnpm --filter @schoolerp/db gen-types` has run against the real schema.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();

  // @supabase/ssr's createServerClient<Database> return type doesn't structurally satisfy
  // @supabase/supabase-js's SupabaseClient<Database> under `exactOptionalPropertyTypes: true`
  // (a generic-instantiation friction between the two packages, not a real behavioral
  // difference) -- the explicit cast forces the clean, correct nominal type every caller
  // actually wants.
  return createServerClient<Database>(
    supabaseEnv.NEXT_PUBLIC_SUPABASE_URL,
    supabaseEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component that can't set cookies (no active response) --
            // middleware.ts refreshes the session on every request, so this is safe to ignore.
          }
        },
      },
    },
  ) as unknown as SupabaseClient<Database>;
}
