import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { env } from "./env";

/**
 * The ONE place the service-role key is used, per CLAUDE.md. This client bypasses RLS
 * entirely -- every caller is responsible for its own authorization checks (e.g. verifying the
 * caller has school.manage_members before touching school_member_role), since Postgres will
 * not do it for this connection.
 *
 * Not typed with `Database` yet: supabase-js's insert/upsert generics do column-presence
 * inference that collapses to `never` against @schoolerp/types' current placeholder index-
 * signature shape (see that package's header -- it's not real generated output). Re-add
 * `createClient<Database>(...)` once `pnpm --filter @schoolerp/db gen-types` has run against a
 * real schema; callers in this file already narrow query results with local interfaces, so
 * this isn't silently trusting `any` beyond that boundary.
 */
/**
 * `realtime.transport` -- supabase-js always instantiates a RealtimeClient even though this
 * admin client never subscribes to a channel; on Node < 22 there is no global `WebSocket`, which
 * throws at construction time, not at first use. Node 22 ships one natively and this becomes a
 * no-op; until every deployment target is guaranteed to run 22+, the explicit `ws` transport is
 * required, not optional.
 */
export function createSupabaseAdminClient() {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: WebSocket as never },
  });
}
