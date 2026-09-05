import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@schoolerp/ui";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getPermissions } from "@/lib/core/auth/permissions";
import { getApplicationDetail, getStageEvents, getApplicationDocuments, getAdmissionStages } from "@/lib/admissions/queries";
import { getMasterDataOverview } from "@/lib/master-data/queries";
import { StageMoveForm } from "@/lib/admissions/components/StageMoveForm";
import { DocumentChecklistSection } from "@/lib/admissions/components/DocumentChecklistSection";
import { ConfirmAdmissionForm } from "@/lib/admissions/components/ConfirmAdmissionForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Field } from "@/components/Field";
import { formatDateDisplay, formatDateTimeDisplayIst } from "@/lib/core/dateIst";

const STAGE_BADGE_STATE: Record<string, "approved" | "pending" | "overdue" | "due"> = {
  in_progress: "pending",
  admitted: "approved",
  rejected: "overdue",
  withdrawn: "due",
};

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const permissions = await getPermissions();
  const canManage = permissions.includes("school.manage_admissions");

  const application = await getApplicationDetail(session.schoolId!, id);
  if (!application) notFound();

  const [stageEvents, documents, stages, overview] = await Promise.all([
    getStageEvents(session.schoolId!, id),
    getApplicationDocuments(session.schoolId!, id),
    getAdmissionStages(session.schoolId!),
    getMasterDataOverview(session.schoolId!),
  ]);

  const sectionsForClass = overview.classesWithSections.find((c) => c.id === application.classApplyingForId)?.sections ?? [];
  const isConfirmed = Boolean(application.confirmedStudentId);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Admissions", href: "/people/admissions" },
          { label: `${application.applicantFirstName} ${application.applicantLastName}` },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {application.applicantFirstName} {application.applicantLastName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Applying for {application.classApplyingForName}</p>
        </div>
        <StatusBadge state={STAGE_BADGE_STATE[application.currentStageType] ?? "pending"} label={application.currentStageName} />
      </div>

      {isConfirmed ? (
        <p className="rounded-md bg-success px-3 py-2 text-sm text-success-foreground">
          Admission confirmed --{" "}
          <Link href={`/people/students/${application.confirmedStudentId}`} className="underline underline-offset-2">
            view student record
          </Link>
          .
        </p>
      ) : null}

      <section className="grid grid-cols-2 gap-4 rounded-md border border-border bg-card p-4 shadow-sm sm:grid-cols-4">
        <Field label="Date of birth" value={formatDateDisplay(application.dob)} />
        <Field label="Gender" value={application.gender} />
        <Field label="Guardian" value={application.guardianName} />
        <Field label="Guardian contact" value={application.guardianPhone ?? application.guardianEmail} />
        <Field label="Applied on" value={formatDateTimeDisplayIst(application.createdAt)} />
      </section>

      {canManage && !isConfirmed ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Move stage</h2>
          <StageMoveForm applicationId={application.id} stages={stages} />
        </section>
      ) : null}

      {canManage ? <DocumentChecklistSection applicationId={application.id} documents={documents} /> : null}

      {canManage && !isConfirmed ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Confirm admission</h2>
          <p className="text-sm text-muted-foreground">
            Creates the student record and current-year enrollment. This cannot be undone from here -- corrections happen on the student profile
            afterward.
          </p>
          <ConfirmAdmissionForm applicationId={application.id} sections={sectionsForClass} />
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Stage history</h2>
        {stageEvents.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {stageEvents.map((e) => (
              <li key={e.id} className="rounded-md border border-border px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{e.stageName}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTimeDisplayIst(e.occurredAt)}</span>
                </div>
                {e.score !== null ? <p className="text-xs text-muted-foreground">Score: {e.score}</p> : null}
                {e.notes ? <p className="text-xs text-muted-foreground">{e.notes}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No stage changes yet.</p>
        )}
      </section>
    </div>
  );
}
