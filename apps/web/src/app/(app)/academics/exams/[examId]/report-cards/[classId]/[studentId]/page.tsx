import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getExam, getReportCardData } from "@/lib/exams/queries";
import { getSchoolBranding } from "@/lib/core/school/getSchoolBranding";
import { ReportCardView } from "@/lib/exams/components/ReportCardView";
import { getDocumentTemplate } from "@/lib/core/pdf/documentTemplates";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function ReportCardPage({ params }: { params: Promise<{ examId: string; classId: string; studentId: string }> }) {
  const { examId, classId, studentId } = await params;
  const session = await requireSession();

  return (
    <RequirePermission permission="school.manage_exams">
      <Body schoolId={session.schoolId!} examId={examId} classId={classId} studentId={studentId} />
    </RequirePermission>
  );
}

async function Body({ schoolId, examId, classId, studentId }: { schoolId: string; examId: string; classId: string; studentId: string }) {
  const exam = await getExam(schoolId, examId);
  if (!exam || (exam.status !== "approved" && exam.status !== "published")) notFound();

  const [data, branding] = await Promise.all([getReportCardData(schoolId, examId, classId, studentId), getSchoolBranding(schoolId)]);
  if (!data) notFound();

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <Breadcrumbs
        items={[
          { label: "Exams", href: "/academics/exams/manage" },
          { label: exam.name, href: `/academics/exams/${examId}` },
          { label: "Report Cards", href: `/academics/exams/${examId}/report-cards` },
          { label: data.studentName },
        ]}
      />
      <a
        href={`/api/exams/${examId}/report-cards/${classId}/${studentId}/pdf`}
        className="flex items-center gap-2 self-end rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary print:hidden"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Download PDF
      </a>
      <div className="shadow-sm print:shadow-none">
        <ReportCardView
          data={data}
          schoolName={branding?.displayName ?? "Report Card"}
          logoUrl={branding?.logoUrl ?? null}
          template={getDocumentTemplate(data.settings.template)}
        />
      </div>
    </div>
  );
}
