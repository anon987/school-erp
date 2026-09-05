import { notFound } from "next/navigation";
import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getExamSubjectDetail, getStudentsForMarksEntry, getGradeBands } from "@/lib/exams/queries";
import { MarksEntryGrid } from "@/lib/exams/components/MarksEntryGrid";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function MarksEntryPage({ params }: { params: Promise<{ examId: string; examSubjectId: string }> }) {
  const { examId, examSubjectId } = await params;
  const session = await requireSession();

  return (
    <RequirePermission permission="school.manage_exams">
      <MarksEntryBody schoolId={session.schoolId!} examId={examId} examSubjectId={examSubjectId} />
    </RequirePermission>
  );
}

async function MarksEntryBody({ schoolId, examId, examSubjectId }: { schoolId: string; examId: string; examSubjectId: string }) {
  const detail = await getExamSubjectDetail(schoolId, examSubjectId);
  if (!detail || detail.examId !== examId) notFound();

  const [students, gradeBands] = await Promise.all([
    getStudentsForMarksEntry(schoolId, detail.classId, detail.academicYearId, examSubjectId),
    getGradeBands(schoolId),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs
        items={[
          { label: "Exams", href: "/academics/exams/manage" },
          { label: detail.examName, href: `/academics/exams/${examId}` },
          { label: `${detail.subjectName} · ${detail.className}` },
        ]}
      />
      <div>
        <h1 className="text-2xl font-semibold">
          {detail.subjectName} — {detail.className}
        </h1>
        <p className="text-sm text-muted-foreground">
          {detail.examName} · Max {detail.maxMarks} {detail.hasInternal ? `(incl. ${detail.internalMaxMarks} internal)` : ""} · Pass {detail.passMarks}
        </p>
      </div>

      {detail.examStatus !== "marks_entry" ? (
        <p className="rounded-md bg-warning px-3 py-2 text-sm text-warning-foreground">
          This exam is not in the marks-entry stage ({detail.examStatus.replace("_", " ")}) -- marks can&apos;t be changed right now.
        </p>
      ) : null}

      <MarksEntryGrid
        examId={examId}
        examSubjectId={examSubjectId}
        students={students}
        maxMarks={detail.maxMarks}
        hasInternal={detail.hasInternal}
        internalMaxMarks={detail.internalMaxMarks}
        gradeBands={gradeBands}
        readOnly={detail.examStatus !== "marks_entry"}
      />
    </div>
  );
}
