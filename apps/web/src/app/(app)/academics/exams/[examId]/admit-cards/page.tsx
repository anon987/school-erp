import Link from "next/link";
import { notFound } from "next/navigation";
import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getExam, getExamClasses } from "@/lib/exams/queries";
import { getSectionOptions, getAdmitCardListForClassSection, getExamAdmitCardSettings } from "@/lib/exams/admitCard.queries";
import { ClassSectionPicker } from "@/lib/exams/components/ClassSectionPicker";
import { AdmitCardBulkList } from "@/lib/exams/components/AdmitCardBulkList";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function AdmitCardsPage({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ classId?: string; sectionId?: string }>;
}) {
  const { examId } = await params;
  const { classId = "", sectionId = "" } = await searchParams;
  const session = await requireSession();

  return (
    <RequirePermission permission="school.manage_exams">
      <Body schoolId={session.schoolId!} examId={examId} classId={classId} sectionId={sectionId} />
    </RequirePermission>
  );
}

async function Body({ schoolId, examId, classId, sectionId }: { schoolId: string; examId: string; classId: string; sectionId: string }) {
  const exam = await getExam(schoolId, examId);
  if (!exam) notFound();

  const [classes, sections] = await Promise.all([getExamClasses(examId), classId ? getSectionOptions(schoolId, classId) : Promise.resolve([])]);

  const basePath = `/academics/exams/${examId}/admit-cards`;

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: "Exams", href: "/academics/exams/manage" }, { label: exam.name, href: `/academics/exams/${examId}` }, { label: "Admit Cards" }]} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Admit Cards — {exam.name}</h1>
        <Link href={`${basePath}/settings`} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary">
          Admit Card Settings
        </Link>
      </div>

      {classes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No classes have subjects configured for this exam yet -- add subjects on the exam's page first.</p>
      ) : (
        <>
          <ClassSectionPicker basePath={basePath} classes={classes} sections={sections} selectedClassId={classId} selectedSectionId={sectionId} />
          {classId && sectionId ? <ClassSectionList schoolId={schoolId} examId={examId} academicYearId={exam.academicYearId} classId={classId} sectionId={sectionId} /> : null}
        </>
      )}
    </div>
  );
}

async function ClassSectionList({ schoolId, examId, academicYearId, classId, sectionId }: { schoolId: string; examId: string; academicYearId: string; classId: string; sectionId: string }) {
  const [rows, settings] = await Promise.all([
    getAdmitCardListForClassSection(schoolId, examId, academicYearId, classId, sectionId),
    getExamAdmitCardSettings(schoolId, examId),
  ]);
  return <AdmitCardBulkList examId={examId} classId={classId} sectionId={sectionId} rows={rows} settings={settings} />;
}
