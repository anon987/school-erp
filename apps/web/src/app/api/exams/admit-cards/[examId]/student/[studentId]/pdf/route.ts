import { NextResponse } from "next/server";
import { getSession } from "@/lib/core/auth/session";
import { hasPermission } from "@/lib/core/auth/permissions";
import { getAdmitCardData, getEffectiveAdmitCardTemplate, evaluateAdmitCardEligibility } from "@/lib/exams/admitCard.queries";
import { getSchoolBranding } from "@/lib/core/school/getSchoolBranding";
import { renderAdmitCardPdf } from "@/lib/exams/admitCardPdf";
import { getDocumentTemplate } from "@/lib/core/pdf/documentTemplates";

export async function GET(_request: Request, { params }: { params: Promise<{ examId: string; studentId: string }> }) {
  const { examId, studentId } = await params;

  const session = await getSession();
  if (!session?.schoolId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!(await hasPermission("school.manage_exams"))) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const data = await getAdmitCardData(session.schoolId, examId, studentId);
  if (!data) return NextResponse.json({ error: "Student not found or not enrolled for this exam's academic year." }, { status: 404 });

  const eligibility = evaluateAdmitCardEligibility(data.settings, data.dueAmountPaise, data.isHeld, data.holdReason);
  if (eligibility.blocked) return NextResponse.json({ error: eligibility.reason }, { status: 403 });

  const [templateKey, branding] = await Promise.all([getEffectiveAdmitCardTemplate(session.schoolId, examId), getSchoolBranding(session.schoolId)]);
  const pdf = await renderAdmitCardPdf(data, branding?.displayName ?? "School", branding?.logoUrl ?? null, getDocumentTemplate(templateKey));

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="admit-card-${data.hallTicketNumber}.pdf"`,
    },
  });
}
