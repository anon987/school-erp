import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getPermissions } from "@/lib/core/auth/permissions";
import { getAuditLog, getLoginHistory, getSecurityPolicy } from "@/lib/auditLog/queries";
import { SecurityPolicyForm } from "@/lib/auditLog/components/SecurityPolicyForm";
import { Pagination } from "@/components/Pagination";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { formatDateTimeDisplayIst } from "@/lib/core/dateIst";

const PAGE_SIZE = 50;

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await requireSession();
  const params = await searchParams;

  return (
    <RequirePermission permission="school.view_audit_log">
      <Body schoolId={session.schoolId!} auditPage={Number(params.auditPage ?? "0") || 0} loginPage={Number(params.loginPage ?? "0") || 0} />
    </RequirePermission>
  );
}

async function Body({ schoolId, auditPage, loginPage }: { schoolId: string; auditPage: number; loginPage: number }) {
  const permissions = await getPermissions();
  const canManageSecurity = permissions.includes("school.manage_members");

  const [auditLog, loginHistory, securityPolicy] = await Promise.all([
    getAuditLog(schoolId, auditPage),
    getLoginHistory(schoolId, loginPage),
    canManageSecurity ? getSecurityPolicy(schoolId) : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Settings" }, { label: "Audit & Security" }]} />
      <h1 className="text-2xl font-semibold">Audit &amp; Security</h1>

      <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Audit Log</h2>
        {auditLog.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-1 pr-3 font-medium">When</th>
                  <th className="py-1 pr-3 font-medium">Who</th>
                  <th className="py-1 pr-3 font-medium">Action</th>
                  <th className="py-1 font-medium">Entity</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.items.map((entry) => (
                  <tr key={entry.id} className="border-b border-border last:border-0">
                    <td className="font-figures py-1.5 pr-3 text-muted-foreground">{formatDateTimeDisplayIst(entry.createdAt)}</td>
                    <td className="py-1.5 pr-3">{entry.actorDisplayName ?? "—"}</td>
                    <td className="py-1.5 pr-3 font-figures">{entry.action}</td>
                    <td className="py-1.5 text-muted-foreground">
                      {entry.entityType}
                      {entry.entityId ? <span className="font-figures"> ({entry.entityId.slice(0, 8)})</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={auditPage} pageSize={PAGE_SIZE} total={auditLog.total} hrefFor={(p) => `/settings/audit-log?auditPage=${p}&loginPage=${loginPage}`} />
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Login History</h2>
        <p className="text-sm text-muted-foreground">Successful sign-ins only -- failed-attempt tracking is a separate, larger piece of work (see the migration notes).</p>
        {loginHistory.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sign-ins recorded yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {loginHistory.items.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between py-1.5 text-sm">
                <span>{entry.displayName ?? entry.email ?? "—"}</span>
                <span className="font-figures text-muted-foreground">{formatDateTimeDisplayIst(entry.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
        <Pagination page={loginPage} pageSize={PAGE_SIZE} total={loginHistory.total} hrefFor={(p) => `/settings/audit-log?auditPage=${auditPage}&loginPage=${p}`} />
      </section>

      {canManageSecurity && securityPolicy ? <SecurityPolicyForm policy={securityPolicy} /> : null}
    </div>
  );
}
