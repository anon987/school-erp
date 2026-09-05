import { NextResponse } from "next/server";
import { getSession } from "@/lib/core/auth/session";
import { hasPermission } from "@/lib/core/auth/permissions";
import { getExam } from "@/lib/exams/queries";
import { getAdmitCardListForClassSection, getAdmitCardData, getEffectiveAdmitCardTemplate, evaluateAdmitCardEligibility, getExamAdmitCardSettings } from "@/lib/exams/admitCard.queries";
import { getSchoolBranding } from "@/lib/core/school/getSchoolBranding";
import { renderAdmitCardsBulkPdf } from "@/lib/exams/admitCardPdf";
import { getDocumentTemplate } from "@/lib/core/pdf/documentTemplates";

/** One PDF, one full page per eligible student -- students who are on hold or fee-locked are
 *  silently skipped from the batch (their row still shows the reason on the bulk list page), not
 *  included with a blank/error page. */
export async function GET(_request: Request, { params }: { params: Promise<{ examId: string; classId: string; sectionId: string }> }) {
  const { examId, classId, sectionId } = await params;

  const session = await getSession();
  if (!session?.schoolId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!(await hasPermission("school.manage_exams"))) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const exam = await getExam(session.schoolId, examId);
  if (!exam) return NextResponse.json({ error: "Exam not found." }, { status: 404 });

  const [listRows, settings] = await Promise.all([
    getAdmitCardListForClassSection(session.schoolId, examId, exam.academicYearId, classId, sectionId),
    getExamAdmitCardSettings(session.schoolId, examId),
  ]);
  const eligibleIds = listRows.filter((r) => !evaluateAdmitCardEligibility(settings, r.dueAmountPaise, r.isHeld, r.holdReason).blocked).map((r) => r.studentId);
  if (eligibleIds.length === 0) return NextResponse.json({ error: "No eligible students in this class and section." }, { status: 404 });

  const dataList = (await Promise.all(eligibleIds.map((studentId) => getAdmitCardData(session.schoolId!, examId, studentId)))).filter((d): d is NonNullable<typeof d> => d !== null);
  if (dataList.length === 0) return NextResponse.json({ error: "No eligible students in this class and section." }, { status: 404 });

  const [templateKey, branding] = await Promise.all([getEffectiveAdmitCardTemplate(session.schoolId, examId), getSchoolBranding(session.schoolId)]);
  const pdf = await renderAdmitCardsBulkPdf(dataList, branding?.displayName ?? "School", branding?.logoUrl ?? null, getDocumentTemplate(templateKey));

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="admit-cards-class.pdf"`,
    },
  });
}
