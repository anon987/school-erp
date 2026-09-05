import type { MessageProvider, SendMessageResult } from "./types";

const MSG91_SMS_URL = "https://api.msg91.com/api/v2/sendsms";

export interface Msg91Config {
  authKey: string;
  senderId: string;
}

/**
 * Written against MSG91's documented SMS API (authkey header, JSON body with sender/route/
 * sms[].message/sms[].to). NOT exercised end-to-end anywhere in this codebase -- no MSG91
 * account/credentials in this environment. Same disclosed-unverified status as
 * packages/integrations/src/payments/razorpayProvider.ts; do not remove this comment when real
 * credentials are finally available -- replace it with a note about when/how it was verified.
 *
 * MSG91 does not return a per-message cost in the send response (billing is via their dashboard/
 * reports API, a separate call this function does not make) -- costPaise is always null here;
 * apps/worker's dispatch job stores whatever this returns as-is, it does not invent a number.
 */
export function createMsg91Provider(config: Msg91Config): Pick<MessageProvider, "sendSms"> {
  return {
    async sendSms(toE164, body) {
      const response = await fetch(MSG91_SMS_URL, {
        method: "POST",
        headers: { authkey: config.authKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: config.senderId,
          route: "4",
          country: "91",
          sms: [{ message: body, to: [toE164.replace(/^\+/, "")] }],
        }),
      });

      const result = (await response.json().catch(() => null)) as { type?: string; message?: string } | null;
      if (!response.ok || result?.type === "error") {
        return { status: "failed", providerMessageId: null, costPaise: null, errorMessage: result?.message ?? `MSG91 send failed (${response.status})` };
      }

      return { status: "sent", providerMessageId: result?.message ?? null, costPaise: null, errorMessage: null };
    },
  };
}
