export type AudienceKind = "guardians" | "staff";
export type NoticeChannel = "in_app" | "sms" | "whatsapp" | "email";
export type ScopeType = "whole_school" | "class" | "section" | "role" | "individual";

export interface NoticeRow {
  id: string;
  title: string;
  body: string;
  audienceKind: AudienceKind;
  channels: NoticeChannel[];
  sentAt: string | null;
  scheduledAt: string | null;
  createdAt: string;
}

export interface NoticeDeliveryStats {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  queued: number;
}

export interface PortalNoticeRow {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}
