"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavGroup, NavItem } from "@/lib/core/nav";
import { t } from "@/lib/core/i18n";

/**
 * Active-state highlighting needs the current path, which only exists client-side
 * (usePathname) -- this is the one piece of the sidebar that has to be a Client Component;
 * everything else about nav visibility (lib/core/nav.ts's getVisibleNavGroups) stays
 * server-computed and is passed in as props, not recomputed here.
 */
function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "block rounded px-2 py-1.5 text-sm font-medium bg-secondary text-secondary-foreground border-l-2 border-primary -ml-0.5 pl-[9px]"
          : "block rounded px-2 py-1.5 text-sm hover:bg-secondary hover:text-secondary-foreground"
      }
    >
      {t(item.labelKey)}
    </Link>
  );
}

export function SidebarNav({ dashboardItem, groups }: { dashboardItem: NavItem; groups: NavGroup[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="w-56 shrink-0 border-r border-border p-2">
      <ul className="flex flex-col gap-1">
        <li>
          <NavLink item={dashboardItem} pathname={pathname} />
        </li>
      </ul>
      {groups.map((group) => (
        <div key={group.labelKey} className="mt-4">
          {/* Sentence case, not uppercase -- t() already returns "People"/"Settings" correctly
              cased; no text-transform here to fight it. */}
          <p className="px-2 text-xs font-medium tracking-wide text-muted-foreground">{t(group.labelKey)}</p>
          <ul className="mt-1 flex flex-col gap-1">
            {group.items.map((item) => (
              <li key={item.href}>
                <NavLink item={item} pathname={pathname} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
