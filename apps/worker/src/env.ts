import { z } from "zod";

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  // Anon key, not service-role: the HTTP layer verifies and acts AS the forwarded caller (RLS
  // applies), the same way apps/web's createSupabaseServerClient does with cookies instead of a
  // bearer header. Only setMemberRoles' actual mutation drops to the service-role client, and
  // only after this layer's own permission/tenant checks pass -- see src/http/verifyRequest.ts.
  SUPABASE_ANON_KEY: z.string().min(1),
  // Shared with apps/web's WORKER_INTERNAL_SECRET (never the browser, never committed) -- a
  // second factor so a request reaching this port has to both carry a real user's access token
  // AND know this secret, not just one or the other. Defense in depth for a service that has
  // never been reachable over the network before this ticket.
  WORKER_INTERNAL_SECRET: z.string().min(16),
  PORT: z.coerce.number().int().positive().default(8787),
  // Fees (P1): Razorpay webhook verification -- keyId/keySecret aren't needed here, order
  // creation happens in apps/web (see lib/fees/actions.ts), the worker only ever verifies and
  // records incoming webhooks.
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1).optional(),
  // Parent Portal (P2): the base URL Supabase's invite-link redirectTo points at
  // (`${APP_URL}/portal/reset-password`). Same value as apps/web's NEXT_PUBLIC_APP_URL --
  // duplicated rather than shared because the two apps don't share an env file.
  APP_URL: z.string().url(),
  // Communication (P2): all optional -- a school with no messaging vendor configured yet still
  // gets in_app delivery; sms/whatsapp/email notifications for that school just fail with a
  // clear "provider not configured" error_message on notification_delivery instead of crashing
  // the whole dispatch run. None of these three are exercised end-to-end anywhere in this
  // codebase -- see packages/integrations/src/messaging's provider files.
  MSG91_AUTH_KEY: z.string().min(1).optional(),
  MSG91_SENDER_ID: z.string().min(1).optional(),
  GUPSHUP_API_KEY: z.string().min(1).optional(),
  GUPSHUP_SOURCE_NUMBER: z.string().min(1).optional(),
  GUPSHUP_APP_NAME: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_ADDRESS: z.string().min(1).optional(),
});

export const env = envSchema.parse(process.env);
