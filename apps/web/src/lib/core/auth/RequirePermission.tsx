import { hasPermission } from "./permissions";

/**
 * Page-level authorization, not just a hidden nav link. A permission check that only lives in
 * lib/nav.ts would let someone reach /settings/members by typing the URL even if their role
 * lost school.manage_members -- this is the server-side check CLAUDE.md requires on every
 * mutation, applied here to the page itself since these are admin surfaces.
 */
export async function RequirePermission({
  permission,
  children,
}: {
  permission: string;
  children: React.ReactNode;
}) {
  const allowed = await hasPermission(permission);
  if (!allowed) {
    return (
      <p role="alert" className="rounded-md bg-danger px-3 py-2 text-sm text-danger-foreground">
        You do not have permission to view this page.
      </p>
    );
  }
  return <>{children}</>;
}
