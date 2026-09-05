import { NextResponse } from "next/server";
import { getPortalSession } from "@/lib/core/auth/portalSession";
import { getExam, getReportCardData } from "@/lib/exams/queries";
import { getSchoolBranding } from "@/lib/core/school/getSchoolBranding";
import { renderReportCardPdf } from "@/lib/exams/reportCardPdf";
import { getDocumentTemplate } from "@/lib/core/pdf/documentTemplates";
import { getLinkedStudents, getPortalExamsForStudent } from "@/lib/portal/queries";

/**
 * Parent-facing counterpart to /api/exams/[examId]/report-cards/[classId]/[studentId]/pdf --
 * same render functions (getReportCardData/renderReportCardPdf), different auth: a guardian
 * session instead of a staff permission, and the student link checked explicitly (not just left
 * to RLS returning nothing) since getReportCardData's null-vs-403 distinction matters less here
 * than being unambiguous about why a request was refused.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ examId: string; studentId: string }> }) {
  const { examId, studentId } = await params;

  const session = await getPortalSession();
  if (!session || session.status !== "active") return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const linkedStudents = await getLinkedStudents(session.schoolId, session.guardianId);
  if (!linkedStudents.some((s) => s.id === studentId)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const exam = await getExam(session.schoolId, examId);
  if (!exam || exam.status !== "published") {
    return NextResponse.json({ error: "This result has not been published yet." }, { status: 404 });
  }

  const studentExams = await getPortalExamsForStudent(studentId);
  const classIdForExam = studentExams.find((e) => e.id === examId)?.classId;
  if (!classIdForExam) return NextResponse.json({ error: "Report card not found." }, { status: 404 });

  const [data, branding] = await Promise.all([
    getReportCardData(session.schoolId, examId, classIdForExam, studentId),
    getSchoolBranding(session.schoolId),
  ]);
  if (!data) return NextResponse.json({ error: "Report card not found." }, { status: 404 });

  const pdf = await renderReportCardPdf(data, branding?.displayName ?? "Report Card", branding?.logoUrl ?? null, getDocumentTemplate(data.settings.template));

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="report-card-${data.admissionNumber}.pdf"`,
    },
  });
}
