import { NextResponse } from "next/server";
import { getSession } from "@/lib/core/auth/session";
import { hasPermission } from "@/lib/core/auth/permissions";
import { getReportCardSetupData } from "@/lib/exams/reportCardSetup.queries";
import { getSchoolBranding } from "@/lib/core/school/getSchoolBranding";
import { renderReportCardPdf } from "@/lib/exams/reportCardPdf";
import { getDocumentTemplate } from "@/lib/core/pdf/documentTemplates";

export async function GET(_request: Request, { params }: { params: Promise<{ setupId: string; classId: string; studentId: string }> }) {
  const { setupId, classId, studentId } = await params;

  const session = await getSession();
  if (!session?.schoolId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!(await hasPermission("school.manage_exams"))) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const [data, branding] = await Promise.all([getReportCardSetupData(session.schoolId, setupId, classId, studentId), getSchoolBranding(session.schoolId)]);
  if (!data) return NextResponse.json({ error: "Report card not found -- the student may be missing results in one of this setup's exams." }, { status: 404 });

  const pdf = await renderReportCardPdf(data, branding?.displayName ?? "Report Card", branding?.logoUrl ?? null, getDocumentTemplate(data.settings.template));

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="report-card-${data.admissionNumber}.pdf"`,
    },
  });
}
