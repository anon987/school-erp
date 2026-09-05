import type { createSupabaseAdminClient } from "../supabaseAdmin";
import type { EmailProvider, MessageProvider } from "@schoolerp/integrations";

export interface NotificationProviders {
  sms: Pick<MessageProvider, "sendSms"> | null;
  whatsapp: Pick<MessageProvider, "sendWhatsApp"> | null;
  email: EmailProvider | null;
}

type Channel = "sms" | "whatsapp" | "email";

interface QueuedNotification {
  id: string;
  school_id: string;
  channel: Channel;
  recipient_type: "guardian" | "staff";
  recipient_guardian_id: string | null;
  recipient_auth_user_id: string | null;
  notice: { title: string; body: string } | null;
}

/**
 * The apps/worker half of "All sends go through a queue in apps/worker, never inline in a
 * request" (CLAUDE.md). Called on demand (right after a notice is published, from the web
 * action's best-effort trigger -- same shape as guardian-portal-account creation) rather than a
 * persistent polling daemon, matching how this worker is described elsewhere ("jobs/webhooks/
 * reconciliation code invoked as scripts/cron", not a long-running process). Safe to call again
 * for the same school if a previous run was interrupted -- it only ever picks up notifications
 * with no notification_delivery row yet.
 */
export async function dispatchQueuedNotifications(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  schoolId: string,
  providers: NotificationProviders,
  limit = 100,
): Promise<{ processed: number; sent: number; failed: number }> {
  const { data: candidates, error: candidatesError } = await admin
    .from("notification")
    .select("id, school_id, channel, recipient_type, recipient_guardian_id, recipient_auth_user_id, notice:notice_id(title, body)")
    .eq("school_id", schoolId)
    .neq("channel", "in_app")
    .limit(limit);
  if (candidatesError) throw candidatesError;

  const rows = (candidates ?? []) as unknown as QueuedNotification[];
  if (rows.length === 0) return { processed: 0, sent: 0, failed: 0 };

  const { data: existingDeliveries, error: deliveriesError } = await admin
    .from("notification_delivery")
    .select("notification_id")
    .in(
      "notification_id",
      rows.map((r) => r.id),
    );
  if (deliveriesError) throw deliveriesError;
  const alreadyDispatched = new Set(((existingDeliveries ?? []) as unknown as { notification_id: string }[]).map((d) => d.notification_id));

  const pending = rows.filter((r) => !alreadyDispatched.has(r.id));
  if (pending.length === 0) return { processed: 0, sent: 0, failed: 0 };

  const guardianIds = [...new Set(pending.filter((r) => r.recipient_guardian_id).map((r) => r.recipient_guardian_id as string))];
  const staffAuthUserIds = [...new Set(pending.filter((r) => r.recipient_auth_user_id).map((r) => r.recipient_auth_user_id as string))];

  const guardianContactByGuardianId = new Map<string, { phone: string | null; email: string | null }>();
  if (guardianIds.length > 0) {
    const { data: links } = await admin.from("student_guardian").select("guardian_id, phone, email").in("guardian_id", guardianIds);
    for (const link of (links ?? []) as unknown as { guardian_id: string; phone: string | null; email: string | null }[]) {
      const existing = guardianContactByGuardianId.get(link.guardian_id) ?? { phone: null, email: null };
      guardianContactByGuardianId.set(link.guardian_id, { phone: existing.phone ?? link.phone, email: existing.email ?? link.email });
    }
  }

  // Two steps, not one filter-on-an-embedded-column query -- PostgREST's support for filtering by
  // a nested embed's column varies by version/settings, so this resolves school_member_id ->
  // auth_user_id first, then staff by school_member_id, and merges in JS (same "two-step, not a
  // fragile embed filter" shape as lib/portal/queries.ts's getLinkedStudents).
  const staffContactByAuthUserId = new Map<string, { phone: string | null; email: string | null }>();
  if (staffAuthUserIds.length > 0) {
    const { data: members } = await admin.from("school_member").select("id, auth_user_id").in("auth_user_id", staffAuthUserIds);
    const memberRows = (members ?? []) as unknown as { id: string; auth_user_id: string }[];
    const authUserIdByMemberId = new Map(memberRows.map((m) => [m.id, m.auth_user_id]));

    if (memberRows.length > 0) {
      const { data: staffRows } = await admin
        .from("staff")
        .select("phone, email, school_member_id")
        .in(
          "school_member_id",
          memberRows.map((m) => m.id),
        );
      for (const s of (staffRows ?? []) as unknown as { phone: string | null; email: string | null; school_member_id: string | null }[]) {
        const authUserId = s.school_member_id ? authUserIdByMemberId.get(s.school_member_id) : undefined;
        if (authUserId) staffContactByAuthUserId.set(authUserId, { phone: s.phone, email: s.email });
      }
    }
  }

  let sent = 0;
  let failed = 0;

  for (const notification of pending) {
    const contact =
      notification.recipient_type === "guardian"
        ? guardianContactByGuardianId.get(notification.recipient_guardian_id ?? "")
        : staffContactByAuthUserId.get(notification.recipient_auth_user_id ?? "");

    const title = notification.notice?.title ?? "";
    const body = notification.notice?.body ?? "";
    const messageText = title ? `${title}: ${body}` : body;

    let provider: "msg91" | "gupshup" | "smtp";
    let result: { status: "sent" | "failed"; providerMessageId: string | null; costPaise: number | null; errorMessage: string | null };

    if (notification.channel === "sms") {
      provider = "msg91";
      const phone = contact?.phone;
      result = !phone
        ? { status: "failed", providerMessageId: null, costPaise: null, errorMessage: "No phone number on file." }
        : !providers.sms
          ? { status: "failed", providerMessageId: null, costPaise: null, errorMessage: "SMS provider not configured." }
          : await providers.sms.sendSms(phone, messageText);
    } else if (notification.channel === "whatsapp") {
      provider = "gupshup";
      const phone = contact?.phone;
      result = !phone
        ? { status: "failed", providerMessageId: null, costPaise: null, errorMessage: "No phone number on file." }
        : !providers.whatsapp
          ? { status: "failed", providerMessageId: null, costPaise: null, errorMessage: "WhatsApp provider not configured." }
          : await providers.whatsapp.sendWhatsApp(phone, messageText);
    } else {
      provider = "smtp";
      const email = contact?.email;
      result = !email
        ? { status: "failed", providerMessageId: null, costPaise: null, errorMessage: "No email address on file." }
        : !providers.email
          ? { status: "failed", providerMessageId: null, costPaise: null, errorMessage: "Email provider not configured." }
          : await providers.email.sendEmail(email, title, body);
    }

    const { error: insertError } = await admin.from("notification_delivery").insert({
      school_id: schoolId,
      notification_id: notification.id,
      provider,
      status: result.status === "sent" ? "sent" : "failed",
      provider_message_id: result.providerMessageId,
      cost_paise: result.costPaise,
      error_message: result.errorMessage,
    });
    if (insertError) throw insertError;

    if (result.status === "sent") sent += 1;
    else failed += 1;
  }

  return { processed: pending.length, sent, failed };
}
