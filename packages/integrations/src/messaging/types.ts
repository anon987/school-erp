/**
 * docs/schoolerp_techstack.md §5 / CLAUDE.md: "Provider abstraction is mandatory. SMS and
 * WhatsApp go through a provider interface. MSG91 and Gupshup are the initial implementations;
 * swapping providers must not touch business logic." apps/worker's dispatch job (the only
 * caller -- CLAUDE.md: "All sends go through a queue in apps/worker, never inline in a
 * request") depends on this interface only, never a vendor SDK directly.
 */
export interface SendMessageResult {
  status: "sent" | "failed";
  providerMessageId: string | null;
  costPaise: number | null;
  errorMessage: string | null;
}

export interface MessageProvider {
  sendSms(toE164: string, body: string): Promise<SendMessageResult>;
  sendWhatsApp(toE164: string, body: string): Promise<SendMessageResult>;
}

/** Email is a channel too (§K), but has no single "the" vendor named in the spec the way SMS/WhatsApp do -- kept as its own small interface rather than folded into MessageProvider. */
export interface EmailProvider {
  sendEmail(toEmail: string, subject: string, body: string): Promise<SendMessageResult>;
}
