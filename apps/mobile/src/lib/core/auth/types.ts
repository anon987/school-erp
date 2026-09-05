/** Mirrors apps/web/src/lib/core/auth/portalSession.ts's PortalSession. */
export interface GuardianSession {
  authUserId: string;
  email: string | null;
  guardianId: string;
  schoolId: string;
  status: "pending_invite" | "blocked_no_contact" | "invited" | "active" | "revoked";
}

/** Mirrors apps/web/src/lib/core/auth/session.ts's AppSession. */
export interface StaffSession {
  authUserId: string;
  email: string | null;
  schoolId: string;
  roles: string[];
}

/**
 * Resolved once per sign-in: which of the two identity shapes this authenticated user has (never
 * both -- see CLAUDE.md's "single Expo app, role-based navigation" decision and this repo's model
 * where a guardian has no school_member row at all). `unresolved` is a real, reportable state: an
 * authenticated Supabase user with neither a guardian_portal_account nor a school_member row,
 * which should never happen for a real invited user but must not crash the app if it does.
 */
export type AuthState =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "guardian"; session: GuardianSession }
  | { status: "staff"; session: StaffSession }
  | { status: "unresolved"; authUserId: string };
