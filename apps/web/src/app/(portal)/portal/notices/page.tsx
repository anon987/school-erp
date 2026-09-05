import { requirePortalSession } from "@/lib/core/auth/portalSession";
import { getPortalNotices } from "@/lib/communication/queries";
import { PortalHeader } from "@/lib/portal/components/PortalHeader";
import { formatDateTimeDisplayIst } from "@/lib/core/dateIst";

export default async function PortalNoticesPage() {
  const session = await requirePortalSession();
  const notices = await getPortalNotices(session.guardianId);

  return (
    <div className="flex min-h-screen flex-col">
      <PortalHeader schoolId={session.schoolId} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
        <h1 className="text-xl font-semibold">Notices</h1>
        {notices.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {notices.map((n) => (
              <li key={n.id} className="rounded-md border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium">{n.title}</h2>
                  <span className="text-xs text-muted-foreground">{formatDateTimeDisplayIst(n.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No notices yet.</p>
        )}
      </main>
    </div>
  );
}
