import { notFound } from "next/navigation";
import { requirePortalSession } from "@/lib/core/auth/portalSession";
import { getGuardianProfile } from "@/lib/portal/queries";
import { PortalHeader } from "@/lib/portal/components/PortalHeader";
import { Field } from "@/components/Field";

/**
 * Read-only for now -- §L's "limited self-service updates with admin approval" needs a
 * correction-request workflow (submit a change, admin approves it) that isn't built in this
 * pass. Deliberately deferred, same as bulk-invite in lib/worker/createGuardianPortalAccount.ts's
 * header comment: lower value than attendance/fees/results/leave, and worth its own design pass
 * rather than a rushed half-version.
 */
export default async function PortalProfilePage() {
  const session = await requirePortalSession();
  const profile = await getGuardianProfile(session.guardianId);
  if (!profile) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <PortalHeader schoolId={session.schoolId} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
        <h1 className="text-xl font-semibold">Your profile</h1>
        <section className="grid grid-cols-2 gap-4 rounded-md border border-border bg-card p-4 shadow-sm">
          <Field label="Name" value={profile.lastName ? `${profile.firstName} ${profile.lastName}` : profile.firstName} />
          <Field label="Email" value={profile.email} />
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">Linked students</h2>
          <ul className="flex flex-col gap-2">
            {profile.links.map((l) => (
              <li key={l.studentId} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span>{l.studentName}</span>
                <span className="text-xs capitalize text-muted-foreground">{l.relationshipType}</span>
              </li>
            ))}
          </ul>
        </section>
        <p className="text-xs text-muted-foreground">To correct any of this information, contact the school office.</p>
      </main>
    </div>
  );
}
