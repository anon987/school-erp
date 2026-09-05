"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import type { NavGroup, NavItem } from "@/lib/core/nav";
import { t } from "@/lib/core/i18n";

const STORAGE_KEY = "schoolerp.nav.collapsedGroups";

/**
 * Exactly one nav item is ever "active" for a given pathname -- the item whose href is the
 * LONGEST matching prefix, not every item whose href happens to be a prefix. Without this, a
 * group whose landing page sits at the group's own base path (e.g. Exams' Dashboard at
 * "/academics/exams", with siblings like "/academics/exams/manage" nested under it) would match
 * both hrefs at once on every sibling page: Dashboard's prefix check
 * ("/academics/exams/manage".startsWith("/academics/exams/")) is also true, so Dashboard never
 * stopped looking selected, and the group's "has an active item" check was always true, so it
 * could never collapse. Longest-prefix-wins fixes both by construction, for any current or future
 * group shaped this way -- not a one-off patch for the Exams group specifically.
 */
function findActiveHref(pathname: string, dashboardItem: NavItem, groups: NavGroup[]): string | null {
  const allHrefs = [dashboardItem.href, ...groups.flatMap((g) => g.items.map((item) => item.href))];
  let best: string | null = null;
  for (const href of allHrefs) {
    if (pathname === href || pathname.startsWith(`${href}/`)) {
      if (!best || href.length > best.length) best = href;
    }
  }
  return best;
}

function groupContainsActive(activeHref: string | null, group: NavGroup): boolean {
  return activeHref !== null && group.items.some((item) => item.href === activeHref);
}

function NavLink({ item, activeHref }: { item: NavItem; activeHref: string | null }) {
  const active = item.href === activeHref;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "flex items-center gap-2 rounded px-2 py-1.5 text-sm font-medium bg-secondary text-secondary-foreground border-l-2 border-primary -ml-0.5 pl-[9px]"
          : "flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-secondary hover:text-secondary-foreground"
      }
    >
      {item.icon}
      {t(item.labelKey)}
    </Link>
  );
}

/**
 * docs/design-system.md > Navigation: icons on every item (done via NavLink), a visible active
 * state (already existed, kept), and collapsible groups -- 18 modules across a handful of groups
 * won't hold as a permanently-flat list. Collapse state is per-user via localStorage, not a
 * backend preference; the group containing the current route always starts expanded regardless
 * of stored state, so navigating somewhere never hides where you are.
 */
export function SidebarNav({ dashboardItem, groups }: { dashboardItem: NavItem; groups: NavGroup[] }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setCollapsed(JSON.parse(stored) as Record<string, boolean>);
    } catch {
      // Ignore malformed/unavailable storage -- groups just default to expanded.
    }
  }, []);

  function toggleGroup(key: string) {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Best-effort persistence only.
      }
      return next;
    });
  }

  const activeHref = findActiveHref(pathname, dashboardItem, groups);

  return (
    <nav aria-label="Primary" className="w-56 shrink-0 border-r border-border p-2">
      <ul className="flex flex-col gap-1">
        <li>
          <NavLink item={dashboardItem} activeHref={activeHref} />
        </li>
      </ul>
      {groups.map((group) => {
        const hasActive = groupContainsActive(activeHref, group);
        const isCollapsed = !hasActive && Boolean(collapsed[group.labelKey]);
        return (
          <div key={group.labelKey} className="mt-4">
            <button
              type="button"
              onClick={() => toggleGroup(group.labelKey)}
              aria-expanded={!isCollapsed}
              className="flex w-full items-center justify-between rounded px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {/* Sentence case, not uppercase -- t() already returns "People"/"Settings"
                  correctly cased; no text-transform here to fight it. */}
              <span>{t(group.labelKey)}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                aria-hidden="true"
              />
            </button>
            {!isCollapsed ? (
              <ul className="mt-1 flex flex-col gap-1">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <NavLink item={item} activeHref={activeHref} />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
