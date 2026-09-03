import { StatusBadge } from "@schoolerp/ui";
import { requireSession } from "@/lib/auth/requireSession";

export default async function DashboardPage() {
  const session = await requireSession();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          School: {session.schoolId ?? "(none)"} · Roles: {session.roles.join(", ") || "(none)"}
        </p>
      </div>

      <p className="text-sm text-muted-foreground">
        Feature modules (students, attendance, fees, ...) are P1 and not built yet. The pieces
        below are a design-system check, not a real widget.
      </p>

      <div className="flex max-w-xs flex-col gap-2 rounded-md border border-border bg-card p-4">
        <span className="text-sm text-muted-foreground">Students enrolled</span>
        <span className="font-figures text-3xl font-semibold">2,200</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <StatusBadge state="present" label="Present" />
        <StatusBadge state="absent" label="Absent" />
        <StatusBadge state="late" label="Late" />
        <StatusBadge state="paid" label="Paid" />
        <StatusBadge state="due" label="Due" />
        <StatusBadge state="overdue" label="Overdue" />
        <StatusBadge state="approved" label="Approved" />
        <StatusBadge state="pending" label="Pending" />
      </div>
    </div>
  );
}
