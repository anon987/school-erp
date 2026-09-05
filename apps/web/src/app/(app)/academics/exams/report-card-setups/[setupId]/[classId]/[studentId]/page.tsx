import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, ClipboardList } from "lucide-react";
import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getReportCardSetup, getReportCardSetupData } from "@/lib/exams/reportCardSetup.queries";
import { getSchoolBranding } from "@/lib/core/school/getSchoolBranding";
import { ReportCardView } from "@/lib/exams/components/ReportCardView";
import { getDocumentTemplate } from "@/lib/core/pdf/documentTemplates";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function ReportCardSetupResultPage({ params }: { params: Promise<{ setupId: string; classId: string; studentId: string }> }) {
  const { setupId, classId, studentId } = await params;
  const session = await requireSession();

  return (
    <RequirePermission permission="school.manage_exams">
      <Body schoolId={session.schoolId!} setupId={setupId} classId={classId} studentId={studentId} />
    </RequirePermission>
  );
}

async function Body({ schoolId, setupId, classId, studentId }: { schoolId: string; setupId: string; classId: string; studentId: string }) {
  const [data, branding, setup] = await Promise.all([getReportCardSetupData(schoolId, setupId, classId, studentId), getSchoolBranding(schoolId), getReportCardSetup(schoolId, setupId)]);
  if (!data) notFound();

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <Breadcrumbs
        items={[
          { label: "Exams", href: "/academics/exams/manage" },
          { label: "Report Cards", href: "/academics/exams/report-cards" },
          { label: data.examName, href: `/academics/exams/report-card-setups/${setupId}` },
          { label: data.studentName },
        ]}
      />
      <div className="flex items-center justify-end gap-2 print:hidden">
        {setup?.includeHpc ? (
          <Link
            href={`/academics/exams/report-card-setups/${setupId}/${classId}/${studentId}/hpc`}
            className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary"
          >
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
            Edit Holistic Progress Card
          </Link>
        ) : null}
        <a
          href={`/api/exams/report-card-setups/${setupId}/${classId}/${studentId}/pdf`}
          className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Download PDF
        </a>
      </div>
      <div className="shadow-sm print:shadow-none">
        <ReportCardView data={data} schoolName={branding?.displayName ?? "Report Card"} logoUrl={branding?.logoUrl ?? null} template={getDocumentTemplate(data.settings.template)} />
      </div>
    </div>
  );
}
