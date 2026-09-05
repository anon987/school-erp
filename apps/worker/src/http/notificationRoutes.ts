import type { IncomingMessage, ServerResponse } from "node:http";
import { createSupabaseAdminClient } from "../supabaseAdmin";
import { dispatchQueuedNotifications } from "../lib/dispatchNotifications";
import { buildNotificationProviders } from "../lib/notificationProviders";
import { HttpError, requireCallerPermission, verifyCaller } from "./verifyRequest";

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

/**
 * Triggered once, best-effort, right after a notice is published (apps/web's server action) --
 * not a persistent queue daemon, see dispatchNotifications.ts's header comment. Safe to call
 * again (e.g. a retry button) for the same school; it only ever picks up notifications with no
 * notification_delivery row yet.
 */
export async function handleDispatchNotifications(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const { caller, userClient } = await verifyCaller(req);
    await requireCallerPermission(userClient, caller.roles, "school.manage_communication");

    const admin = createSupabaseAdminClient();
    const result = await dispatchQueuedNotifications(admin, caller.schoolId, buildNotificationProviders());

    sendJson(res, 200, result);
  } catch (err) {
    if (err instanceof HttpError) {
      sendJson(res, err.status, { error: err.message });
      return;
    }
    console.error("[worker] handleDispatchNotifications failed:", err);
    sendJson(res, 500, { error: "Internal error." });
  }
}
