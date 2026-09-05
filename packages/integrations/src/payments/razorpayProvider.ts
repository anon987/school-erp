import { createHmac, timingSafeEqual } from "node:crypto";
import type { CreateOrderResult, PaymentProvider } from "./types";

const RAZORPAY_ORDERS_URL = "https://api.razorpay.com/v1/orders";

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
}

/**
 * Talks to Razorpay's REST API directly via fetch rather than the `razorpay` npm SDK -- the
 * surface this product needs (create an order, verify a webhook signature) is two calls' worth
 * of code, not a reason to add a dependency. If Razorpay's API grows into something this adapter
 * can't reasonably hand-roll, swap the internals here; PaymentProvider's callers never know the
 * difference either way.
 *
 * NOT exercised end-to-end anywhere in this codebase -- no sandbox credentials, no live webhook
 * to trigger in this environment. Written against Razorpay's documented Orders API and HMAC
 * webhook-signature scheme; flagging this explicitly rather than claiming it's been verified.
 */
export function createRazorpayProvider(config: RazorpayConfig): PaymentProvider {
  return {
    async createOrder(receiptNumber, amountPaise) {
      const auth = Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64");
      const response = await fetch(RAZORPAY_ORDERS_URL, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt: receiptNumber }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Razorpay order creation failed (${response.status}): ${body}`);
      }

      const data = (await response.json()) as { id: string; amount: number; currency: string };
      return { orderId: data.id, amountPaise: data.amount, currency: data.currency };
    },

    // Razorpay's documented scheme: HMAC-SHA256 of the raw request body, keyed with the webhook
    // secret, hex-encoded, compared against the X-Razorpay-Signature header. Must run on the RAW
    // body string (not a re-serialized parsed object) -- re-serializing can reorder keys or
    // change whitespace and silently break every signature.
    verifyWebhookSignature(rawBody, signatureHeader) {
      if (!signatureHeader) return false;
      const expected = createHmac("sha256", config.webhookSecret).update(rawBody).digest("hex");

      const expectedBuffer = Buffer.from(expected, "hex");
      const providedBuffer = Buffer.from(signatureHeader, "hex");
      // Different lengths would throw inside timingSafeEqual rather than just returning false --
      // an attacker-controlled header must never be able to trigger a different code path than
      // "signature invalid."
      if (expectedBuffer.length !== providedBuffer.length) return false;
      return timingSafeEqual(expectedBuffer, providedBuffer);
    },
  } satisfies PaymentProvider;
}

export type { CreateOrderResult, PaymentProvider };
