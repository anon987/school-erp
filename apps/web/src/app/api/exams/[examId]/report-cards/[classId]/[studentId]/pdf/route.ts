import { NextResponse } from "next/server";
import { getSession } from "@/lib/core/auth/session";
import { hasPermission } from "@/lib/core/auth/permissions";
import { getExam, getReportCardData } from "@/lib/exams/queries";
import { getSchoolBranding } from "@/lib/core/school/getSchoolBranding";
import { renderReportCardPdf } from "@/lib/exams/reportCardPdf";
import { getDocumentTemplate } from "@/lib/core/pdf/documentTemplates";

export async function GET(_request: Request, { params }: { params: Promise<{ examId: string; classId: string; studentId: string }> }) {
  const { examId, classId, studentId } = await params;

  const session = await getSession();
  if (!session?.schoolId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!(await hasPermission("school.manage_exams"))) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const exam = await getExam(session.schoolId, examId);
  if (!exam || (exam.status !== "approved" && exam.status !== "published")) {
    return NextResponse.json({ error: "Report cards are available once results are approved." }, { status: 404 });
  }

  const [data, branding] = await Promise.all([getReportCardData(session.schoolId, examId, classId, studentId), getSchoolBranding(session.schoolId)]);
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
