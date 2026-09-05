import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/core/supabase/server";

/**
 * Supabase's invite-link redirect lands here with `?token=...&type=invite` (GoTrue's
 * admin.generateLink flow), NOT a PKCE `?code=...` -- verified against a real generated link
 * (packages/db's scratch verification script): admin-issued invite/recovery links are exchanged
 * via `verifyOtp({token_hash, type})`, `exchangeCodeForSession` is for the browser-initiated PKCE
 * flow and does not apply here. Getting this wrong is silent until a real guardian tries to
 * click a real link, so it was worth verifying end-to-end rather than assuming the PKCE shape.
 *
 * The exchange happens in a Route Handler, not the confirm page's Server Component --
 * createSupabaseServerClient's cookie adapter silently no-ops `setAll` when called from a Server
 * Component (see that file's comment), so a session established there would never actually
 * persist. This handler does the exchange (which DOES persist, Route Handlers can set cookies),
 * then redirects to the plain confirm page that renders the set-password form.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash") ?? url.searchParams.get("token");
  const type = url.searchParams.get("type");
  if (!tokenHash || (type !== "invite" && type !== "recovery")) {
    return NextResponse.redirect(new URL("/portal/login", url));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) return NextResponse.redirect(new URL("/portal/login", url));

  return NextResponse.redirect(new URL("/portal/reset-password/confirm", url));
}
