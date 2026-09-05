import Link from "next/link";
import { Plus } from "lucide-react";
import { StatusBadge } from "@schoolerp/ui";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getPermissions } from "@/lib/core/auth/permissions";
import { getEnquiries, getApplications, getAdmissionStages } from "@/lib/admissions/queries";
import { getMasterDataOverview } from "@/lib/master-data/queries";
import { NewEnquiryForm } from "@/lib/admissions/components/NewEnquiryForm";
import { CloseEnquiryButton } from "@/lib/admissions/components/CloseEnquiryButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { formatDateTimeDisplayIst } from "@/lib/core/dateIst";

const STAGE_BADGE_STATE: Record<string, "approved" | "pending" | "overdue" | "due"> = {
  in_progress: "pending",
  admitted: "approved",
  rejected: "overdue",
  withdrawn: "due",
};

export default async function AdmissionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await requireSession();
  const permissions = await getPermissions();
  const canManage = permissions.includes("school.manage_admissions");
  const params = await searchParams;
  const stageFilter = params.stageId ?? "";

  const [enquiries, applications, stages, overview] = await Promise.all([
    getEnquiries(session.schoolId!),
    getApplications(session.schoolId!, stageFilter ? { stageId: stageFilter } : {}),
    getAdmissionStages(session.schoolId!),
    getMasterDataOverview(session.schoolId!),
  ]);

  const openEnquiries = enquiries.filter((e) => e.status === "open");

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Admissions" }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Admissions</h1>
          <p className="mt-1 text-sm text-muted-foreground">Enquiries and applications, from first contact to a confirmed student.</p>
        </div>
        {canManage ? (
          <Link
            href="/people/admissions/new"
            className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New application
          </Link>
        ) : null}
      </div>

      {canManage ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">New enquiry</h2>
          <NewEnquiryForm classes={overview.classesWithSections.map((c) => ({ id: c.id, name: c.name }))} />
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Open enquiries ({openEnquiries.length})</h2>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Contact</th>
                <th className="px-3 py-2">Class interested</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Enquired on</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {openEnquiries.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-secondary/50">
                  <td className="px-3 py-1.5 font-medium">
                    {e.firstName} {e.lastName ?? ""}
                  </td>
                  <td className="px-3 py-1.5 text-muted-foreground">{e.phone || e.email || "—"}</td>
                  <td className="px-3 py-1.5">{e.classInterestedName ?? "—"}</td>
                  <td className="px-3 py-1.5 capitalize">{e.source.replace("_", " ")}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{formatDateTimeDisplayIst(e.createdAt)}</td>
                  <td className="px-3 py-1.5 text-right">
                    {canManage ? (
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/people/admissions/new?enquiryId=${e.id}`}
                          className="rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary"
                        >
                          Convert to application
                        </Link>
                        <CloseEnquiryButton enquiryId={e.id} />
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
              {openEnquiries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No open enquiries.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Applications</h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/people/admissions"
            className={`rounded-md border px-2 py-1 text-xs ${stageFilter === "" ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"}`}
          >
            All
          </Link>
          {stages.map((s) => (
            <Link
              key={s.id}
              href={`/people/admissions?stageId=${s.id}`}
              className={`rounded-md border px-2 py-1 text-xs ${stageFilter === s.id ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"}`}
            >
              {s.name}
            </Link>
          ))}
        </div>

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <th className="px-3 py-2">Applicant</th>
                <th className="px-3 py-2">Class applying for</th>
                <th className="px-3 py-2">Stage</th>
                <th className="px-3 py-2">Applied on</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-secondary/50">
                  <td className="px-3 py-1.5">
                    <Link href={`/people/admissions/${a.id}`} className="font-medium underline-offset-2 hover:underline">
                      {a.applicantFirstName} {a.applicantLastName}
                    </Link>
                  </td>
                  <td className="px-3 py-1.5">{a.classApplyingForName}</td>
                  <td className="px-3 py-1.5">
                    <StatusBadge state={STAGE_BADGE_STATE[a.currentStageType] ?? "pending"} label={a.currentStageName} />
                  </td>
                  <td className="px-3 py-1.5 text-muted-foreground">{formatDateTimeDisplayIst(a.createdAt)}</td>
                </tr>
              ))}
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No applications yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
