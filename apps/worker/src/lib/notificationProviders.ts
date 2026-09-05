import { createMsg91Provider, createGupshupProvider, createResendEmailProvider } from "@schoolerp/integrations";
import type { NotificationProviders } from "./dispatchNotifications";
import { env } from "../env";

/** Builds whichever providers have credentials configured; the rest are `null` (see dispatchNotifications.ts for how a missing provider is handled). */
export function buildNotificationProviders(): NotificationProviders {
  return {
    sms: env.MSG91_AUTH_KEY && env.MSG91_SENDER_ID ? createMsg91Provider({ authKey: env.MSG91_AUTH_KEY, senderId: env.MSG91_SENDER_ID }) : null,
    whatsapp:
      env.GUPSHUP_API_KEY && env.GUPSHUP_SOURCE_NUMBER && env.GUPSHUP_APP_NAME
        ? createGupshupProvider({ apiKey: env.GUPSHUP_API_KEY, sourceNumber: env.GUPSHUP_SOURCE_NUMBER, appName: env.GUPSHUP_APP_NAME })
        : null,
    email:
      env.RESEND_API_KEY && env.RESEND_FROM_ADDRESS
        ? createResendEmailProvider({ apiKey: env.RESEND_API_KEY, fromAddress: env.RESEND_FROM_ADDRESS })
        : null,
  };
}
