import type { TranslationKey } from "./i18n";

export interface NavItem {
  labelKey: TranslationKey;
  href: string;
  /** Omit for items every signed-in member sees regardless of role. */
  permission?: string;
}

/**
 * Navigation is permission-aware, not role-aware, per docs/schoolerp_features.md §1.2: "A
 * teacher never sees finance." Gating on the permission a link's destination actually requires
 * means a new role automatically sees the right nav the moment role_permission grants it
 * something -- nobody has to remember to update this list.
 *
 * labelKey, not a literal string: Hindi is a P2 requirement (CLAUDE.md), so nav labels go
 * through the same translation lookup as everything else from day one instead of being
 * retrofitted later.
 */
export const NAV_ITEMS: NavItem[] = [
  { labelKey: "nav.dashboard", href: "/dashboard" },
  { labelKey: "nav.school_profile", href: "/settings/school", permission: "school.manage_profile" },
  { labelKey: "nav.branding", href: "/settings/branding", permission: "school.manage_branding" },
  { labelKey: "nav.members", href: "/settings/members", permission: "school.manage_members" },
  { labelKey: "nav.audit_log", href: "/settings/audit-log", permission: "school.view_audit_log" },
];
