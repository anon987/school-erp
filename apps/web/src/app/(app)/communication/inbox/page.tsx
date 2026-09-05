import { requireSession } from "@/lib/core/auth/requireSession";
import { getStaffInbox } from "@/lib/communication/queries";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { formatDateTimeDisplayIst } from "@/lib/core/dateIst";

export default async function CommunicationInboxPage() {
  const session = await requireSession();
  const notices = await getStaffInbox(session.authUserId);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Communication" }, { label: "Inbox" }]} />
      <h1 className="text-2xl font-semibold">Notices addressed to you</h1>
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
    </div>
  );
}
