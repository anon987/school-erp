// P1: apps/worker gains its first HTTP entry point (CLAUDE.md's Architecture rules --
// prerequisite for /settings/members, which needs setMemberRoles' service-role mutation but must
// never let that key reach apps/web). Scheduled jobs/webhooks/queues still don't exist yet --
// those arrive with the features that need them, starting with Fees' payment webhooks.
import { env } from "./env";
import { createSupabaseAdminClient } from "./supabaseAdmin";
import { createHttpServer } from "./http/server";

function main() {
  createSupabaseAdminClient();
  const server = createHttpServer();
  server.listen(env.PORT, () => {
    console.log(`[worker] listening on :${env.PORT}`);
  });
}

main();
