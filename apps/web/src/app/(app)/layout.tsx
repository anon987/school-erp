import Link from "next/link";
import { deriveBrandTokens } from "@schoolerp/ui";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getPermissions } from "@/lib/core/auth/permissions";
import { getSchoolBranding } from "@/lib/core/school/getSchoolBranding";
import { DASHBOARD_ITEM, getVisibleNavGroups } from "@/lib/core/nav";
import { t } from "@/lib/core/i18n";
import { ThemeToggle } from "@/lib/core/theme/ThemeToggle";
import { signOutAction } from "@/lib/core/auth/actions";

/**
 * The role-aware shell. Every authenticated page renders inside this layout, which:
 *  1. requires a session (redirects to /login otherwise) -- requireSession() calls getUser(),
 *     which round-trips to Supabase Auth, so this is a real server-side check, not a UI guard.
 *  2. resolves the caller's permission set once via fn_role_permissions (same source of truth
 *     RLS uses -- see lib/core/auth/permissions.ts) and groups nav by it (lib/core/nav.ts).
 *  3. injects the school's brand tokens as CSS custom properties, scoped to this layout's
 *     wrapper -- server-rendered, so there's no flash and no client JS needed. Only
 *     --primary/--accent (+foregrounds) are ever overridden; everything else in
 *     globals.css (status colors, neutrals, type scale) is fixed product identity.
 * No page under this layout should re-implement "am I allowed to see this" from scratch; it
 * should ask for the specific permission its content needs.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const permissions = await getPermissions();
  const branding = session.schoolId ? await getSchoolBranding(session.schoolId) : null;

  const visibleGroups = getVisibleNavGroups(permissions);

  // school_branding.brand_ramp is meant to cache this (computed once, at save time -- see the
  // column comment in the school_isolation_core migration). No branding-edit UI exists yet
  // (that's a feature build, out of scope this session) to ever populate it, so this
  // recomputes on every request as a functional fallback. Swap for "prefer brand_ramp if
  // present" once that save path exists.
  const brandTokens = branding ? deriveBrandTokens(branding.brandColorHex) : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {brandTokens ? (
        <style
          // Scoped to .school-theme, split by .dark, so the existing dark-mode class toggle on
          // <html> selects the right variant -- no client JS needed to pick light vs dark brand.
          dangerouslySetInnerHTML={{
            __html: `
.school-theme {
  --primary: ${brandTokens.light.primary};
  --primary-foreground: ${brandTokens.light.primaryForeground};
  --accent: ${brandTokens.light.accent};
  --accent-foreground: ${brandTokens.light.accentForeground};
}
.dark .school-theme {
  --primary: ${brandTokens.dark.primary};
  --primary-foreground: ${brandTokens.dark.primaryForeground};
  --accent: ${brandTokens.dark.accent};
  --accent-foreground: ${brandTokens.dark.accentForeground};
}`,
          }}
        />
      ) : null}
      <div className="school-theme flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="text-sm font-medium">{branding?.displayName ?? "School ERP"}</span>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="text-sm text-muted-foreground">{session.email ?? session.authUserId}</span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded border border-border px-2 py-1 text-sm hover:bg-secondary"
              >
                {t("auth.logout")}
              </button>
            </form>
          </div>
        </header>
        <div className="flex flex-1">
          <nav aria-label="Primary" className="w-56 shrink-0 border-r border-border p-2">
            <ul className="flex flex-col gap-1">
              <li>
                <Link
                  href={DASHBOARD_ITEM.href}
                  className="block rounded px-2 py-1.5 text-sm hover:bg-secondary hover:text-secondary-foreground"
                >
                  {t(DASHBOARD_ITEM.labelKey)}
                </Link>
              </li>
            </ul>
            {visibleGroups.map((group) => (
              <div key={group.labelKey} className="mt-4">
                <p className="px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t(group.labelKey)}
                </p>
                <ul className="mt-1 flex flex-col gap-1">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="block rounded px-2 py-1.5 text-sm hover:bg-secondary hover:text-secondary-foreground"
                      >
                        {t(item.labelKey)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
          <main className="flex-1 p-4">{children}</main>
        </div>
      </div>
    </div>
  );
}
