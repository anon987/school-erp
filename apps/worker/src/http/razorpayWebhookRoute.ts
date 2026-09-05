import type { IncomingMessage, ServerResponse } from "node:http";
import { createRazorpayProvider } from "@schoolerp/integrations";
import { env } from "../env";
import { createSupabaseAdminClient } from "../supabaseAdmin";

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readRawBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    payment: {
      entity: {
        id: string;
        order_id: string;
        status: string;
      };
    };
  };
}

/**
 * The ONLY path that ever marks an online payment captured (CLAUDE.md: "Never mark an invoice
 * paid from a client-side success callback"). Signature verification happens BEFORE the body is
 * even parsed as JSON -- an unverified payload is never trusted enough to look at its contents,
 * let alone act on them.
 *
 * NOT exercised end-to-end -- no Razorpay sandbox account/webhook to trigger against in this
 * environment. Written against Razorpay's documented `payment.captured` / `payment.failed`
 * event shape; review this against a real payload before relying on it in production.
 */
export async function handleRazorpayWebhook(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    sendJson(res, 503, { error: "Razorpay webhook is not configured on this deployment." });
    return;
  }

  const rawBody = await readRawBody(req);
  const signature = req.headers["x-razorpay-signature"];

  const provider = createRazorpayProvider({ keyId: "", keySecret: "", webhookSecret: env.RAZORPAY_WEBHOOK_SECRET });
  const isValid = provider.verifyWebhookSignature(rawBody, typeof signature === "string" ? signature : null);
  if (!isValid) {
    sendJson(res, 401, { error: "Invalid webhook signature." });
    return;
  }

  let payload: RazorpayWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
  } catch {
    sendJson(res, 400, { error: "Invalid JSON body." });
    return;
  }

  const paymentEntity = payload.payload?.payment?.entity;
  if (!paymentEntity) {
    sendJson(res, 400, { error: "Unrecognised payload shape." });
    return;
  }

  const admin = createSupabaseAdminClient();
  const newStatus = payload.event === "payment.captured" ? "captured" : payload.event === "payment.failed" ? "failed" : null;
  if (!newStatus) {
    // Some other Razorpay event this endpoint doesn't act on (e.g. order.paid) -- acknowledge
    // it so Razorpay doesn't retry, but there's nothing to update.
    sendJson(res, 200, { ok: true, ignored: payload.event });
    return;
  }

  const { error } = await admin
    .from("payment")
    .update({ status: newStatus, razorpay_payment_id: paymentEntity.id })
    .eq("razorpay_order_id", paymentEntity.order_id)
    .eq("status", "pending_gateway");
  if (error) {
    console.error("[worker] razorpay webhook: failed to update payment:", error);
    sendJson(res, 500, { error: "Could not record payment update." });
    return;
  }

  sendJson(res, 200, { ok: true });
}
