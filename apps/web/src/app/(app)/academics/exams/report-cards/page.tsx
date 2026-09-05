import Link from "next/link";
import { Palette, GitMerge } from "lucide-react";
import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getCurrentAcademicYearId } from "@/lib/core/school/getCurrentAcademicYear";
import { getReportCardSettings, getExams } from "@/lib/exams/queries";
import { getReportCardSetups } from "@/lib/exams/reportCardSetup.queries";
import { deleteReportCardSetupAction } from "@/lib/exams/reportCardSetup.actions";
import { getSchoolBranding } from "@/lib/core/school/getSchoolBranding";
import { ReportCardSettingsSection } from "@/lib/exams/components/ReportCardSettingsSection";
import { ReportCardSetupForm } from "@/lib/exams/components/ReportCardSetupForm";
import { ReportCardSetupPublishToggle } from "@/lib/exams/components/ReportCardSetupPublishToggle";
import { ReportCardSetupHpcToggle } from "@/lib/exams/components/ReportCardSetupHpcToggle";
import { ExamsDeleteButton } from "@/lib/exams/components/ExamsDeleteButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function ReportCardsPage() {
  const session = await requireSession();

  return (
    <RequirePermission permission="school.manage_exams">
      <Body schoolId={session.schoolId!} />
    </RequirePermission>
  );
}

async function Body({ schoolId }: { schoolId: string }) {
  const academicYearId = await getCurrentAcademicYearId(schoolId);
  const [settings, branding] = await Promise.all([getReportCardSettings(schoolId), getSchoolBranding(schoolId)]);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Exams", href: "/academics/exams" }, { label: "Report Cards" }]} />
      <div>
        <h1 className="text-2xl font-semibold">Report Cards</h1>
        <p className="mt-1 text-sm text-muted-foreground">Everything about how this school's report cards look and what they're built from, in one place.</p>
      </div>

      <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Palette className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Default Design</h2>
            <p className="text-sm text-muted-foreground">
              Used automatically every time a report card is generated for a single exam. Most schools only need this section — pick a design, choose what shows, done.
            </p>
          </div>
        </div>
        <ReportCardSettingsSection settings={settings} schoolName={branding?.displayName ?? "School"} logoUrl={branding?.logoUrl ?? null} />
      </section>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium text-muted-foreground">Optional</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <GitMerge className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Combined Report Cards</h2>
            <p className="text-sm text-muted-foreground">
              Only needed if the school issues ONE report card that blends several exams together — e.g. an "Annual Report" combining Term 1 (50%) and Term 2 (50%).{" "}
              <strong>Skip this if every exam already gets its own separate report card</strong> (that's what Default Design above handles).
            </p>
          </div>
        </div>
        {academicYearId ? <CombinedReportCards schoolId={schoolId} academicYearId={academicYearId} /> : (
          <p className="text-sm text-muted-foreground">No current academic year set -- configure one in Master Data first.</p>
        )}
      </section>
    </div>
  );
}

async function CombinedReportCards({ schoolId, academicYearId }: { schoolId: string; academicYearId: string }) {
  const [setups, exams] = await Promise.all([getReportCardSetups(schoolId, academicYearId), getExams(schoolId, academicYearId)]);

  return (
    <div className="flex flex-col gap-4">
      {setups.length > 0 ? (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50 text-left text-muted-foreground">
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Exams &amp; Weightage</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {setups.map((setup) => (
                <tr key={setup.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-medium">{setup.name}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {setup.exams.map((e) => (
                        <span key={e.examId} className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                          {e.examName} ({e.weightPercent}%)
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs">{setup.isPublished ? "Published" : "Draft"}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/academics/exams/report-card-setups/${setup.id}`} className="text-xs text-primary underline-offset-2 hover:underline">
                        Generate
                      </Link>
                      <ReportCardSetupPublishToggle setupId={setup.id} isPublished={setup.isPublished} />
                      <ReportCardSetupHpcToggle setupId={setup.id} includeHpc={setup.includeHpc} />
                      <ExamsDeleteButton action={deleteReportCardSetupAction.bind(null, setup.id)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">None set up yet.</p>
      )}

      {exams.length === 0 ? (
        <p className="text-sm text-muted-foreground">Create an exam first before combining exams into one report card.</p>
      ) : (
        <ReportCardSetupForm academicYearId={academicYearId} exams={exams} />
      )}
    </div>
  );
}
