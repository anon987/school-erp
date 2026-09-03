import { RequirePermission } from "@/lib/auth/RequirePermission";

export default function AuditLogPage() {
  return (
    <RequirePermission permission="school.view_audit_log">
      <h1 className="text-xl font-semibold">Audit Log</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The audit_log table is written to by setMemberRoles today. A viewer UI is a feature build.
      </p>
    </RequirePermission>
  );
}
