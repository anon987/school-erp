import { notFound } from "next/navigation";
import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getExam } from "@/lib/exams/queries";
import { getExamAdmitCardSettings } from "@/lib/exams/admitCard.queries";
import { ExamAdmitCardSettingsForm } from "@/lib/exams/components/ExamAdmitCardSettingsForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function AdmitCardSettingsPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const session = await requireSession();

  return (
    <RequirePermission permission="school.manage_exams">
      <Body schoolId={session.schoolId!} examId={examId} />
    </RequirePermission>
  );
}

async function Body({ schoolId, examId }: { schoolId: string; examId: string }) {
  const exam = await getExam(schoolId, examId);
  if (!exam) notFound();
  const settings = await getExamAdmitCardSettings(schoolId, examId);

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs
        items={[
          { label: "Exams", href: "/academics/exams/manage" },
          { label: exam.name, href: `/academics/exams/${examId}` },
          { label: "Admit Cards", href: `/academics/exams/${examId}/admit-cards` },
          { label: "Settings" },
        ]}
      />
      <h1 className="text-2xl font-semibold">Admit Card Settings — {exam.name}</h1>
      <ExamAdmitCardSettingsForm examId={examId} settings={settings} />
    </div>
  );
}
