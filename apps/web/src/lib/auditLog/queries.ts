import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import type { AuditLogEntry, LoginHistoryEntry, PagedResult, SecurityPolicy } from "./types";

const PAGE_SIZE = 50;

export async function getAuditLog(schoolId: string, page: number, actionFilter?: string): Promise<PagedResult<AuditLogEntry>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("fn_get_audit_log", {
    p_school_id: schoolId,
    ...(actionFilter ? { p_action_filter: actionFilter } : {}),
    p_limit: PAGE_SIZE,
    p_offset: page * PAGE_SIZE,
  });
  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
    actor_display_name: string | null;
    actor_email: string | null;
    total_count: number;
  }[];

  return {
    items: rows.map((r) => ({
      id: r.id,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      metadata: r.metadata,
      createdAt: r.created_at,
      actorDisplayName: r.actor_display_name,
      actorEmail: r.actor_email,
    })),
    total: rows[0]?.total_count ?? 0,
  };
}

export async function getLoginHistory(schoolId: string, page: number): Promise<PagedResult<LoginHistoryEntry>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("fn_get_login_history", { p_school_id: schoolId, p_limit: PAGE_SIZE, p_offset: page * PAGE_SIZE });
  if (error) throw error;

  const rows = (data ?? []) as unknown as { id: string; auth_user_id: string; display_name: string | null; email: string | null; created_at: string; total_count: number }[];

  return {
    items: rows.map((r) => ({ id: r.id, authUserId: r.auth_user_id, displayName: r.display_name, email: r.email, createdAt: r.created_at })),
    total: rows[0]?.total_count ?? 0,
  };
}

const DEFAULT_SECURITY_POLICY: SecurityPolicy = { minPasswordLength: 8, sessionExpiryMinutes: null };

export async function getSecurityPolicy(schoolId: string): Promise<SecurityPolicy> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("school_security_policy").select("min_password_length, session_expiry_minutes").eq("school_id", schoolId).maybeSingle();
  if (error) throw error;
  if (!data) return DEFAULT_SECURITY_POLICY;
  const row = data as unknown as { min_password_length: number; session_expiry_minutes: number | null };
  return { minPasswordLength: row.min_password_length, sessionExpiryMinutes: row.session_expiry_minutes };
}
