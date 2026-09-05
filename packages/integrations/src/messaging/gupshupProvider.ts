import type { MessageProvider } from "./types";

const GUPSHUP_WHATSAPP_URL = "https://api.gupshup.io/wa/api/v1/msg";

export interface GupshupConfig {
  apiKey: string;
  sourceNumber: string;
  appName: string;
}

/**
 * Written against Gupshup's documented WhatsApp send API (apikey header, form-encoded body:
 * channel=whatsapp, source, destination, message as a JSON text payload, src.name). NOT
 * exercised end-to-end anywhere in this codebase -- no Gupshup account/credentials in this
 * environment. Same disclosed-unverified status as razorpayProvider.ts/msg91Provider.ts.
 */
export function createGupshupProvider(config: GupshupConfig): Pick<MessageProvider, "sendWhatsApp"> {
  return {
    async sendWhatsApp(toE164, body) {
      const form = new URLSearchParams({
        channel: "whatsapp",
        source: config.sourceNumber,
        destination: toE164.replace(/^\+/, ""),
        "src.name": config.appName,
        message: JSON.stringify({ type: "text", text: body }),
      });

      const response = await fetch(GUPSHUP_WHATSAPP_URL, {
        method: "POST",
        headers: { apikey: config.apiKey, "Content-Type": "application/x-www-form-urlencoded" },
        body: form,
      });

      const result = (await response.json().catch(() => null)) as { status?: string; messageId?: string } | null;
      if (!response.ok || result?.status !== "submitted") {
        return { status: "failed", providerMessageId: null, costPaise: null, errorMessage: `Gupshup send failed (${response.status})` };
      }

      return { status: "sent", providerMessageId: result.messageId ?? null, costPaise: null, errorMessage: null };
    },
  };
}
