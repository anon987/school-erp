import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "./env";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Refreshes the auth session cookie on every request. Required with @supabase/ssr's cookie
 * model -- without this, server components see stale/expired sessions because nothing else in
 * the request pipeline calls supabase.auth.getUser() early enough to rotate the cookie.
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
  await supabase.auth.getUser();

  return response;
}
