import Link from "next/link";
import { requirePortalSession } from "@/lib/core/auth/portalSession";
import { getLinkedStudents } from "@/lib/portal/queries";
import { PortalHeader } from "@/lib/portal/components/PortalHeader";

export default async function PortalDashboardPage() {
  const session = await requirePortalSession();
  const students = await getLinkedStudents(session.schoolId, session.guardianId);

  return (
    <div className="flex min-h-screen flex-col">
      <PortalHeader schoolId={session.schoolId} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
        <h1 className="text-xl font-semibold">Your children</h1>
        {students.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {students.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/portal/students/${s.id}`}
                  className="flex items-center justify-between rounded-md border border-border bg-card p-4 shadow-sm hover:bg-secondary/50"
                >
                  <span className="font-medium">
                    {s.firstName} {s.lastName}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {s.className ? `${s.className}${s.sectionName ? ` - ${s.sectionName}` : ""}` : "—"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No students are linked to this account yet.</p>
        )}
        <div className="flex gap-4">
          <Link href="/portal/notices" className="text-sm underline-offset-2 hover:underline">
            Notices
          </Link>
          <Link href="/portal/profile" className="text-sm underline-offset-2 hover:underline">
            Your profile
          </Link>
        </div>
      </main>
    </div>
  );
}
