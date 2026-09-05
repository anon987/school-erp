import { createSupabaseServerClient } from "../supabase/server";

export interface AppSession {
  authUserId: string;
  email: string | null;
  schoolId: string | null;
  roles: string[];
}

function decodeAccessTokenClaims(accessToken: string): { schoolId: string | null; roles: string[] } {
  const payloadSegment = accessToken.split(".")[1];
  if (!payloadSegment) return { schoolId: null, roles: [] };

  const json = Buffer.from(payloadSegment, "base64url").toString("utf8");
  const payload = JSON.parse(json) as { school_id?: string; roles?: string[] };
  return { schoolId: payload.school_id ?? null, roles: payload.roles ?? [] };
}

/**
 * Reads the caller's identity and tenant claims.
 *
 * Two calls, deliberately: `getUser()` asks Supabase Auth to verify the token is genuine and
 * unexpired (never trust a locally-decoded token on its own -- a tampered cookie would decode
 * just fine). Only once that succeeds do we read `getSession()`'s access_token to pull out the
 * school_id/roles claims custom_access_token_hook stamped onto it.
 */
export async function getSession(): Promise<AppSession | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const claims = decodeAccessTokenClaims(session.access_token);

  return {
    authUserId: user.id,
    email: user.email ?? null,
    schoolId: claims.schoolId,
    roles: claims.roles,
  };
}

/**
 * The raw access token, not exposed on AppSession itself -- only one caller needs it
 * (lib/members/actions.ts, forwarding the caller's own identity to apps/worker's HTTP entry
 * point so it can verify the request under RLS as that user) and every other consumer of
 * getSession() has no business handling a bearer token.
 */
export async function getAccessToken(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}
