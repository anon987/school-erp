import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { env } from "./env";

/**
 * The anon-key counterpart to supabaseAdmin.ts's service-role client: authenticated as whoever's
 * access token gets passed in, via the Authorization header rather than a cookie jar (there's no
 * browser session here, apps/web forwards its own caller's token). Every query through this
 * client runs under RLS as that user -- this is how the HTTP layer checks "does this caller
 * actually have school.manage_members, and is the target school_member actually in their own
 * school" without reimplementing either check: the same fn_has_permission RPC and the same
 * school_member_select RLS policy the rest of the product already relies on.
 */
/** See supabaseAdmin.ts's comment on `realtime.transport` -- same Node < 22 WebSocket requirement, same fix. */
export function createSupabaseUserClient(accessToken: string) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    realtime: { transport: WebSocket as never },
  });
}
