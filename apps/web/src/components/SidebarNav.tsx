"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import type { NavGroup, NavItem } from "@/lib/core/nav";
import { t } from "@/lib/core/i18n";

const STORAGE_KEY = "schoolerp.nav.collapsedGroups";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function groupContainsActive(pathname: string, group: NavGroup): boolean {
  return group.items.some((item) => isActive(pathname, item.href));
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
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

  return (
    <nav aria-label="Primary" className="w-56 shrink-0 border-r border-border p-2">
      <ul className="flex flex-col gap-1">
        <li>
          <NavLink item={dashboardItem} pathname={pathname} />
        </li>
      </ul>
      {groups.map((group) => {
        const hasActive = groupContainsActive(pathname, group);
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
                    <NavLink item={item} pathname={pathname} />
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
