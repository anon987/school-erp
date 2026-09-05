import type { EmailProvider } from "./types";

const RESEND_API_URL = "https://api.resend.com/emails";

export interface ResendConfig {
  apiKey: string;
  fromAddress: string;
}

/**
 * Email has no single named vendor in docs/schoolerp_techstack.md §5 the way SMS/WhatsApp do
 * (MSG91/Gupshup) -- this is A reasonable choice (a plain HTTP API, no SMTP server to run,
 * fetch-only like every other provider here), not THE choice; EmailProvider is the seam a school
 * or a later decision can swap behind without touching apps/worker's dispatch job. NOT exercised
 * end-to-end anywhere in this codebase -- no Resend account/credentials in this environment.
 */
export function createResendEmailProvider(config: ResendConfig): EmailProvider {
  return {
    async sendEmail(toEmail, subject, body) {
      const response = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: config.fromAddress, to: [toEmail], subject, text: body }),
      });

      const result = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;
      if (!response.ok) {
        return { status: "failed", providerMessageId: null, costPaise: null, errorMessage: result?.message ?? `Resend send failed (${response.status})` };
      }

      return { status: "sent", providerMessageId: result?.id ?? null, costPaise: null, errorMessage: null };
    },
  };
}
