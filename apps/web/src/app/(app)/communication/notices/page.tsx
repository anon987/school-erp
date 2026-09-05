import { requireSession } from "@/lib/core/auth/requireSession";
import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { getMasterDataOverview } from "@/lib/master-data/queries";
import { getNotices, getNoticeDeliveryStats, getRoleOptions } from "@/lib/communication/queries";
import { ComposeNoticeForm } from "@/lib/communication/components/ComposeNoticeForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { formatDateTimeDisplayIst } from "@/lib/core/dateIst";

export default async function NoticesPage() {
  const session = await requireSession();

  const [overview, roles, notices] = await Promise.all([
    getMasterDataOverview(session.schoolId!),
    getRoleOptions(),
    getNotices(session.schoolId!),
  ]);

  const noticesWithStats = await Promise.all(
    notices.map(async (n) => ({ notice: n, stats: n.sentAt ? await getNoticeDeliveryStats(n.id) : null })),
  );

  return (
    <RequirePermission permission="school.manage_communication">
      <div className="flex flex-col gap-6">
        <Breadcrumbs items={[{ label: "Communication" }, { label: "Notices" }]} />
        <h1 className="text-2xl font-semibold">Notices &amp; announcements</h1>

        <ComposeNoticeForm classes={overview.classesWithSections} roles={roles} />

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Sent</h2>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Audience</th>
                  <th className="px-3 py-2">Channels</th>
                  <th className="px-3 py-2">Sent</th>
                  <th className="px-3 py-2">Delivery</th>
                </tr>
              </thead>
              <tbody>
                {noticesWithStats.map(({ notice, stats }) => (
                  <tr key={notice.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-1.5 font-medium">{notice.title}</td>
                    <td className="px-3 py-1.5 capitalize">{notice.audienceKind}</td>
                    <td className="px-3 py-1.5 text-xs text-muted-foreground">{notice.channels.join(", ")}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{notice.sentAt ? formatDateTimeDisplayIst(notice.sentAt) : "Not sent yet"}</td>
                    <td className="px-3 py-1.5 text-xs text-muted-foreground">
                      {stats ? `${stats.sent + stats.delivered}/${stats.total} sent${stats.failed > 0 ? `, ${stats.failed} failed` : ""}${stats.queued > 0 ? `, ${stats.queued} queued` : ""}` : "—"}
                    </td>
                  </tr>
                ))}
                {noticesWithStats.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-sm text-muted-foreground">
                      No notices yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </RequirePermission>
  );
}
