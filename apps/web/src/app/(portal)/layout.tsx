import type { ReactNode } from "react";

/**
 * Deliberately its own layout, not (app)'s -- docs/schoolerp_techstack.md §2.4: folding the
 * portal into the staff shell would make it easy to accidentally reuse a permission check built
 * for "any staff member with a role permission" in a context that actually requires "only this
 * specific guardian's own children." Nothing staff-specific (SidebarNav, role-aware nav.tsx) is
 * imported here.
 */
export default function PortalLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-background text-foreground">{children}</div>;
}
