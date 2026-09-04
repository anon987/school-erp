import type { TranslationKey } from "./i18n";

export interface NavItem {
  labelKey: TranslationKey;
  href: string;
  /** Omit for items every signed-in member sees regardless of role. */
  permission?: string;
}

export interface NavGroup {
  labelKey: TranslationKey;
  items: NavItem[];
}

/**
 * Navigation is permission-aware, not role-aware, per docs/schoolerp_features.md §1.2: "A
 * teacher never sees finance." Gating on the permission a link's destination actually requires
 * means a new role automatically sees the right nav the moment role_permission grants it
 * something -- nobody has to remember to update this list.
 *
 * This file holds ZERO role/permission logic of its own -- it is a static declaration of
 * "route X needs permission Y." The actual yes/no check is always fn_role_permissions /
 * fn_has_permission over RPC (lib/core/auth/permissions.ts), the same source of truth RLS
 * policies use. Nav is the most tempting place for a second, parallel permission
 * implementation to sneak in (e.g. "hide this whole group for teachers") -- don't. A group's
 * visibility is always DERIVED (see getVisibleNavGroups below), never a separately-declared
 * list of roles/permissions for the group itself.
 *
 * Groups match docs/schoolerp_features.md §2's module list, not an arbitrary split -- see
 * docs/schoolerp_techstack.md §2.4 for why the parent/student portal is a separate route group
 * entirely, not one of these. Reports (§T) are NOT a group here on purpose: every P1 baseline
 * report maps to an existing domain (fee reports -> finance, attendance reports -> academics,
 * ...) and lives there; only P4's cross-module analytics would ever justify a standalone group.
 *
 * labelKey, not a literal string: Hindi is a P2 requirement (CLAUDE.md), so nav labels go
 * through the same translation lookup as everything else from day one instead of being
 * retrofitted later.
 */
export const DASHBOARD_ITEM: NavItem = { labelKey: "nav.dashboard", href: "/dashboard" };

export const NAV_GROUPS: NavGroup[] = [
  // academics/: Attendance (§E), Exams (§G), Timetable (§I, P2), Homework (§J, P2).
  // finance/: Fees (§F), Accounts & Expenses (§N, P3), Payroll (§O, P3).
  // operations/: Transport/Library/Hostel/Inventory (§P/Q/R/S, P3).
  // communication/: Communication (§K, P2).
  {
    // No permission on these: the directories are broad-read/gated-write (RLS already scopes
    // reads to the caller's school; only creating/editing needs manage_students/manage_staff) --
    // matching that here, not gating the nav link itself behind the write permission, which would
    // hide it from teachers/accountants who should still be able to browse.
    labelKey: "nav.group.people",
    items: [
      { labelKey: "nav.students", href: "/people/students" },
      { labelKey: "nav.staff", href: "/people/staff" },
    ],
  },
  {
    labelKey: "nav.group.settings",
    items: [
      { labelKey: "nav.school_profile", href: "/settings/school", permission: "school.manage_profile" },
      { labelKey: "nav.master_data", href: "/settings/master-data", permission: "school.manage_master_data" },
      { labelKey: "nav.branding", href: "/settings/branding", permission: "school.manage_branding" },
      { labelKey: "nav.members", href: "/settings/members", permission: "school.manage_members" },
      { labelKey: "nav.audit_log", href: "/settings/audit-log", permission: "school.view_audit_log" },
    ],
  },
];

/**
 * The one place group visibility is computed: a group appears if at least one of its items
 * survives permission filtering. `permissions` must already be the caller's resolved set (from
 * getPermissions()) -- this function does no permission lookup itself, only array filtering.
 */
export function getVisibleNavGroups(permissions: string[]): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || permissions.includes(item.permission)),
  })).filter((group) => group.items.length > 0);
}
