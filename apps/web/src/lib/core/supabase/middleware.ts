import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "./env";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/** Pulls `iat` (standard JWT claim) and `school_id` (stamped by custom_access_token_hook) straight
 * off the access token -- same decode-without-verify approach as lib/core/auth/session.ts, safe
 * here because getUser() just above already verified the token against Supabase Auth. */
function decodeIatAndSchoolId(accessToken: string): { iat: number | null; schoolId: string | null } {
  const payloadSegment = accessToken.split(".")[1];
  if (!payloadSegment) return { iat: null, schoolId: null };
  try {
    const json = Buffer.from(payloadSegment, "base64url").toString("utf8");
    const payload = JSON.parse(json) as { iat?: number; school_id?: string };
    return { iat: payload.iat ?? null, schoolId: payload.school_id ?? null };
  } catch {
    return { iat: null, schoolId: null };
  }
}

/**
 * Refreshes the auth session cookie on every request. Required with @supabase/ssr's cookie
 * model -- without this, server components see stale/expired sessions because nothing else in
 * the request pipeline calls supabase.auth.getUser() early enough to rotate the cookie.
 *
 * Also enforces `school_security_policy.session_expiry_minutes` (packages/db/supabase/migrations/
 * 20260905140000_audit_log_and_security.sql) -- a per-school force-logout after N minutes since
 * the token was issued. This is deliberately a soft, app-level check (comparing the JWT's `iat`
 * against wall-clock time), not a change to Supabase Auth's own project-wide JWT lifetime, which
 * cannot be varied per tenant. A school with no policy row (the common case) costs one extra
 * indexed primary-key lookup per request beyond the getUser() call already happening here.
 */
export async function updateSupabaseSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseEnv.NEXT_PUBLIC_SUPABASE_URL,
    supabaseEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Calling getUser() (not getSession()) is what actually triggers the refresh -- it revalidates
  // against Supabase Auth rather than trusting the locally-stored token.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const { iat, schoolId } = session ? decodeIatAndSchoolId(session.access_token) : { iat: null, schoolId: null };

    if (iat && schoolId) {
      const { data: policy } = await supabase
        .from("school_security_policy")
        .select("session_expiry_minutes")
        .eq("school_id", schoolId)
        .maybeSingle();
      const expiryMinutes = (policy as { session_expiry_minutes: number | null } | null)?.session_expiry_minutes ?? null;

      if (expiryMinutes !== null) {
        const ageSeconds = Math.floor(Date.now() / 1000) - iat;
        if (ageSeconds > expiryMinutes * 60) {
          await supabase.auth.signOut();

          const pathname = request.nextUrl.pathname;
          if (!pathname.startsWith("/api/") && pathname !== "/login") {
            const redirectResponse = NextResponse.redirect(new URL("/login", request.url));
            for (const cookie of response.cookies.getAll()) redirectResponse.cookies.set(cookie);
            return redirectResponse;
          }
        }
      }
    }
  }

  return response;
}
