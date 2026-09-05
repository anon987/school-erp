import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import type { AudienceKind, NoticeChannel, NoticeDeliveryStats, NoticeRow, PortalNoticeRow } from "./types";

export interface RoleOption {
  id: string;
  label: string;
}

/** Same P1-phase filter as lib/members/queries.ts's getAssignableRoles, but with `id` instead of `key` -- notice_audience.scope_id for a 'role' scope needs the role's real id. */
export async function getRoleOptions(): Promise<RoleOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("role").select("id, label").eq("phase", "P1").order("label");
  if (error) throw error;
  return (data ?? []) as unknown as RoleOption[];
}

export async function getNotices(schoolId: string): Promise<NoticeRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("notice")
    .select("id, title, body, audience_kind, channels, sent_at, scheduled_at, created_at")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (
    (data ?? []) as unknown as {
      id: string;
      title: string;
      body: string;
      audience_kind: AudienceKind;
      channels: NoticeChannel[];
      sent_at: string | null;
      scheduled_at: string | null;
      created_at: string;
    }[]
  ).map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    audienceKind: n.audience_kind,
    channels: n.channels,
    sentAt: n.sent_at,
    scheduledAt: n.scheduled_at,
    createdAt: n.created_at,
  }));
}

/** notification rows with no notification_delivery row are still queued (matches apps/worker's dispatch job definition of "pending"). */
export async function getNoticeDeliveryStats(noticeId: string): Promise<NoticeDeliveryStats> {
  const supabase = await createSupabaseServerClient();
  const { data: notifications, error: notificationsError } = await supabase.from("notification").select("id").eq("notice_id", noticeId);
  if (notificationsError) throw notificationsError;

  const notificationIds = ((notifications ?? []) as unknown as { id: string }[]).map((n) => n.id);
  if (notificationIds.length === 0) return { total: 0, sent: 0, delivered: 0, failed: 0, queued: 0 };

  const { data: deliveries, error: deliveriesError } = await supabase
    .from("notification_delivery")
    .select("notification_id, status")
    .in("notification_id", notificationIds);
  if (deliveriesError) throw deliveriesError;

  const deliveryByNotificationId = new Map(
    ((deliveries ?? []) as unknown as { notification_id: string; status: "sent" | "delivered" | "failed" }[]).map((d) => [d.notification_id, d.status]),
  );

  const stats: NoticeDeliveryStats = { total: notificationIds.length, sent: 0, delivered: 0, failed: 0, queued: 0 };
  for (const id of notificationIds) {
    const status = deliveryByNotificationId.get(id);
    if (status === "sent") stats.sent += 1;
    else if (status === "delivered") stats.delivered += 1;
    else if (status === "failed") stats.failed += 1;
    else stats.queued += 1;
  }
  return stats;
}

/** In-app notices addressed to the signed-in portal guardian (RLS already scopes this via notification_select_guardian_recipient). */
export async function getPortalNotices(guardianId: string): Promise<PortalNoticeRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("notification")
    .select("created_at, notice:notice_id(id, title, body)")
    .eq("recipient_type", "guardian")
    .eq("recipient_guardian_id", guardianId)
    .eq("channel", "in_app")
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (
    (data ?? []) as unknown as { created_at: string; notice: { id: string; title: string; body: string } | null }[]
  )
    .filter((row) => row.notice)
    .map((row) => ({ id: row.notice!.id, title: row.notice!.title, body: row.notice!.body, createdAt: row.created_at }));
}

/** Staff-side counterpart to getPortalNotices -- same shape, notification_select_staff_recipient RLS instead. */
export async function getStaffInbox(authUserId: string): Promise<PortalNoticeRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("notification")
    .select("created_at, notice:notice_id(id, title, body)")
    .eq("recipient_type", "staff")
    .eq("recipient_auth_user_id", authUserId)
    .eq("channel", "in_app")
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (
    (data ?? []) as unknown as { created_at: string; notice: { id: string; title: string; body: string } | null }[]
  )
    .filter((row) => row.notice)
    .map((row) => ({ id: row.notice!.id, title: row.notice!.title, body: row.notice!.body, createdAt: row.created_at }));
}
