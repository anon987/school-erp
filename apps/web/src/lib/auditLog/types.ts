export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  actorDisplayName: string | null;
  actorEmail: string | null;
}

export interface LoginHistoryEntry {
  id: string;
  authUserId: string;
  displayName: string | null;
  email: string | null;
  createdAt: string;
}

export interface SecurityPolicy {
  minPasswordLength: number;
  sessionExpiryMinutes: number | null;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
}
