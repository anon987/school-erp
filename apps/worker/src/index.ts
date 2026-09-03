// P0 has no scheduled jobs, webhooks, or queues yet -- those arrive with the features that need
// them (payment reconciliation, messaging sends, imports) starting P1. This entry point exists
// so the service boots and its env/admin-client wiring can be exercised.
import { createSupabaseAdminClient } from "./supabaseAdmin";

function main() {
  createSupabaseAdminClient();
  console.log("[worker] service-role client initialised; no jobs registered yet (P0).");
}

main();
