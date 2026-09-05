import { notFound } from "next/navigation";
import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getReportCardSetup } from "@/lib/exams/reportCardSetup.queries";
import { getClassRoster } from "@/lib/exams/queries";
import { getHpcDataForStudent, getHpcRatingScaleOptions } from "@/lib/exams/hpc.queries";
import { HpcAssessmentForm } from "@/lib/exams/components/HpcAssessmentForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function HpcAssessmentPage({ params }: { params: Promise<{ setupId: string; classId: string; studentId: string }> }) {
  const { setupId, classId, studentId } = await params;
  const session = await requireSession();

  return (
    <RequirePermission permission="school.manage_exams">
      <Body schoolId={session.schoolId!} setupId={setupId} classId={classId} studentId={studentId} />
    </RequirePermission>
  );
}

async function Body({ schoolId, setupId, classId, studentId }: { schoolId: string; setupId: string; classId: string; studentId: string }) {
  const setup = await getReportCardSetup(schoolId, setupId);
  if (!setup || !setup.includeHpc) notFound();

  const [roster, hpc, ratingScales] = await Promise.all([
    getClassRoster(schoolId, classId, setup.academicYearId),
    getHpcDataForStudent(schoolId, setupId, studentId),
    getHpcRatingScaleOptions(schoolId),
  ]);
  const student = roster.find((s) => s.studentId === studentId);
  if (!student) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Breadcrumbs
        items={[
          { label: "Exams", href: "/academics/exams/manage" },
          { label: "Report Cards", href: "/academics/exams/report-cards" },
          { label: setup.name, href: `/academics/exams/report-card-setups/${setupId}` },
          { label: `${student.firstName} ${student.lastName}`, href: `/academics/exams/report-card-setups/${setupId}/${classId}/${studentId}` },
          { label: "Holistic Progress Card" },
        ]}
      />
      <h1 className="text-2xl font-semibold">
        Holistic Progress Card &mdash; {student.firstName} {student.lastName}
      </h1>
      <HpcAssessmentForm setupId={setupId} classId={classId} studentId={studentId} hpc={hpc} ratingScales={ratingScales} />
    </div>
  );
}
