import { supabase } from "../core/supabase/client";
import type { PortalNoticeRow } from "../portal/types";

/** Mirrors apps/web/src/lib/communication/queries.ts's getPortalNotices/getStaffInbox. */
export async function getPortalNotices(guardianId: string): Promise<PortalNoticeRow[]> {
  const { data, error } = await supabase
    .from("notification")
    .select("created_at, notice:notice_id(id, title, body)")
    .eq("recipient_type", "guardian")
    .eq("recipient_guardian_id", guardianId)
    .eq("channel", "in_app")
    .order("created_at", { ascending: false });
  if (error) throw error;

  return ((data ?? []) as unknown as { created_at: string; notice: { id: string; title: string; body: string } | null }[])
    .filter((row) => row.notice)
    .map((row) => ({ id: row.notice!.id, title: row.notice!.title, body: row.notice!.body, createdAt: row.created_at }));
}

export async function getStaffInbox(authUserId: string): Promise<PortalNoticeRow[]> {
  const { data, error } = await supabase
    .from("notification")
    .select("created_at, notice:notice_id(id, title, body)")
    .eq("recipient_type", "staff")
    .eq("recipient_auth_user_id", authUserId)
    .eq("channel", "in_app")
    .order("created_at", { ascending: false });
  if (error) throw error;

  return ((data ?? []) as unknown as { created_at: string; notice: { id: string; title: string; body: string } | null }[])
    .filter((row) => row.notice)
    .map((row) => ({ id: row.notice!.id, title: row.notice!.title, body: row.notice!.body, createdAt: row.created_at }));
}
