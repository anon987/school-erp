import Link from "next/link";
import { getSchoolBranding } from "@/lib/core/school/getSchoolBranding";
import { portalSignOutAction } from "../actions";

export async function PortalHeader({ schoolId, showSignOut = true }: { schoolId: string; showSignOut?: boolean }) {
  const branding = await getSchoolBranding(schoolId);

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
      <Link href="/portal" className="flex items-center gap-2">
        {branding?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={branding.logoUrl} alt="" className="h-8 w-8 rounded object-contain" />
        ) : null}
        <span className="font-semibold">{branding?.displayName ?? "School"} Portal</span>
      </Link>
      {showSignOut ? (
        <form action={portalSignOutAction}>
          <button type="submit" className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-secondary">
            Sign out
          </button>
        </form>
      ) : null}
    </header>
  );
}
