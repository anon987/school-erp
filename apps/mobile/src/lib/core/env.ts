/**
 * Public, safe-to-ship config -- same split as apps/web/.env.example: only the Supabase URL and
 * ANON (publishable) key ever belong in this app. The service-role key must never exist here, and
 * neither should apps/worker's WORKER_INTERNAL_SECRET (see portal/actions.ts's header comment for
 * why the invite-activation flow can't just reuse that secret from a mobile bundle).
 *
 * `EXPO_PUBLIC_*` vars are inlined into the bundle at build time by Expo's own tooling (reads
 * `.env`/`.env.local` automatically -- see .env.example in this directory), the RN-appropriate
 * equivalent of Next.js's `NEXT_PUBLIC_*` convention apps/web already uses. No app.config.js
 * indirection needed for these two.
 */
interface PublicEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  workerUrl: string;
}

function readEnv(): PublicEnv {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const workerUrl = process.env.EXPO_PUBLIC_WORKER_URL ?? "";

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase config. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env (see .env.example) before starting the app.",
    );
  }

  return { supabaseUrl, supabaseAnonKey, workerUrl };
}

export const publicEnv = readEnv();
