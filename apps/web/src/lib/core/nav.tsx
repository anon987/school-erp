import type { ReactNode } from "react";
import { LayoutDashboard, GraduationCap, Users, School, Settings2, Palette, UserCog, History, ClipboardCheck, Wallet, Award, ListChecks, FileBadge2, IdCard, UserPlus, Megaphone, CalendarDays } from "lucide-react";
import type { TranslationKey } from "./i18n";

export interface NavItem {
  labelKey: TranslationKey;
  href: string;
  /** docs/design-system.md > Navigation: every nav item gets a leading icon, no exceptions. */
  icon: ReactNode;
  /** Omit for items every signed-in member sees regardless of role. */
  permission?: string;
}

export interface NavGroup {
  labelKey: TranslationKey;
  items: NavItem[];
}

const ICON_CLASS = "h-5 w-5 shrink-0";

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
 *
 * `icon` is a rendered element (`<LayoutDashboard />`), not a bare component reference. This
 * file is server-shared data (getVisibleNavGroups's output crosses into SidebarNav, a Client
 * Component, as a prop) -- React Server Components can serialize a rendered element across that
 * boundary but not a raw function/component reference, which is exactly what a bare
 * `icon: LayoutDashboard` produced ("Functions cannot be passed directly to Client Components").
 * Rendering the icon here, once, is also why this file is .tsx and not .ts.
 */
export const DASHBOARD_ITEM: NavItem = {
  labelKey: "nav.dashboard",
  href: "/dashboard",
  icon: <LayoutDashboard className={ICON_CLASS} aria-hidden="true" />,
};

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
      { labelKey: "nav.students", href: "/people/students", icon: <GraduationCap className={ICON_CLASS} aria-hidden="true" /> },
      { labelKey: "nav.admissions", href: "/people/admissions", icon: <UserPlus className={ICON_CLASS} aria-hidden="true" /> },
      { labelKey: "nav.staff", href: "/people/staff", icon: <Users className={ICON_CLASS} aria-hidden="true" /> },
    ],
  },
  {
    // No permission on the group/item itself -- broad-read like people/ (anyone in the school can
    // see whether a section's attendance was marked and browse reports; marking/correcting is
    // gated by the mutation, via attendance.mark_own_class / attendance.manage, not by hiding the
    // nav link from roles that can still legitimately view it).
    labelKey: "nav.group.academics",
    items: [
      { labelKey: "nav.attendance", href: "/academics/attendance", icon: <ClipboardCheck className={ICON_CLASS} aria-hidden="true" /> },
      // Points at /my, not the class-timetable builder -- broad-read like attendance above (any
      // teacher should see their own schedule), whereas the builder itself is manage_timetable-
      // gated and linked FROM this page for those who hold it, not a separate nav entry (a
      // teacher without that permission would otherwise get a dead-end "no permission" page).
      { labelKey: "nav.timetable", href: "/academics/timetable/my", icon: <CalendarDays className={ICON_CLASS} aria-hidden="true" /> },
      { labelKey: "nav.homework", href: "/academics/homework", icon: <ListChecks className={ICON_CLASS} aria-hidden="true" /> },
    ],
  },
  {
    // Its own group, not an item under academics/ -- Exams outgrew a single link (setup,
    // dashboard, admit cards, report cards all need their own page), and this is the same split
    // Settings already uses for exactly the same reason (one module, several sub-pages behind a
    // collapsible group), not a new pattern. Report card design (single exam) and combined
    // report cards (multiple exams, weighted) live on ONE page/nav item -- they were two
    // similarly-named separate pages at first and users found that confusing, since the second is
    // just an optional extension of the first, not a distinct concept.
    labelKey: "nav.group.exams",
    items: [
      { labelKey: "nav.exams_dashboard", href: "/academics/exams", icon: <Award className={ICON_CLASS} aria-hidden="true" /> },
      { labelKey: "nav.exams_manage", href: "/academics/exams/manage", icon: <ListChecks className={ICON_CLASS} aria-hidden="true" /> },
      { labelKey: "nav.report_cards", href: "/academics/exams/report-cards", icon: <FileBadge2 className={ICON_CLASS} aria-hidden="true" /> },
      { labelKey: "nav.admit_card_settings", href: "/academics/exams/admit-card-settings", icon: <IdCard className={ICON_CLASS} aria-hidden="true" /> },
    ],
  },
  {
    // Unlike people/ and academics/, this group IS permission-gated on the item itself --
    // docs/schoolerp_features.md §1.2, quoted in this file's own header comment: "a teacher
    // never sees finance." Fee status is money, not a directory a whole staff should browse.
    labelKey: "nav.group.finance",
    items: [{ labelKey: "nav.fees", href: "/finance/fees", icon: <Wallet className={ICON_CLASS} aria-hidden="true" />, permission: "school.manage_fees" }],
  },
  {
    // Permission-gated on the item, same reasoning as finance/ above -- composing/sending a
    // notice to the whole school (or SMS/WhatsApp that cost money) is not a broad-read surface.
    labelKey: "nav.group.communication",
    items: [
      // No permission on Inbox -- broad-read like people/academics above: every signed-in staff
      // member should see notices addressed to them, whether or not they can compose one.
      { labelKey: "nav.inbox", href: "/communication/inbox", icon: <Megaphone className={ICON_CLASS} aria-hidden="true" /> },
      {
        labelKey: "nav.notices",
        href: "/communication/notices",
        icon: <Megaphone className={ICON_CLASS} aria-hidden="true" />,
        permission: "school.manage_communication",
      },
    ],
  },
  {
    labelKey: "nav.group.settings",
    items: [
      {
        labelKey: "nav.school_profile",
        href: "/settings/school",
        icon: <School className={ICON_CLASS} aria-hidden="true" />,
        permission: "school.manage_profile",
      },
      {
        labelKey: "nav.master_data",
        href: "/settings/master-data",
        icon: <Settings2 className={ICON_CLASS} aria-hidden="true" />,
        permission: "school.manage_master_data",
      },
      {
        labelKey: "nav.branding",
        href: "/settings/branding",
        icon: <Palette className={ICON_CLASS} aria-hidden="true" />,
        permission: "school.manage_branding",
      },
      {
        labelKey: "nav.members",
        href: "/settings/members",
        icon: <UserCog className={ICON_CLASS} aria-hidden="true" />,
        permission: "school.manage_members",
      },
      {
        labelKey: "nav.audit_log",
        href: "/settings/audit-log",
        icon: <History className={ICON_CLASS} aria-hidden="true" />,
        permission: "school.view_audit_log",
      },
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
