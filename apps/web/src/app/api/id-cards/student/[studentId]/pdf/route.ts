import { NextResponse } from "next/server";
import { getSession } from "@/lib/core/auth/session";
import { hasPermission } from "@/lib/core/auth/permissions";
import { getStudentIdCardData, getIdCardSettings } from "@/lib/idCards/queries";
import { getSchoolBranding } from "@/lib/core/school/getSchoolBranding";
import { renderIdCardPdf } from "@/lib/idCards/idCardPdf";
import { getIdCardTemplate } from "@/lib/idCards/idCardTemplates";

export async function GET(_request: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;

  const session = await getSession();
  if (!session?.schoolId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!(await hasPermission("school.manage_students"))) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const [data, settings, branding] = await Promise.all([
    getStudentIdCardData(session.schoolId, studentId),
    getIdCardSettings(session.schoolId),
    getSchoolBranding(session.schoolId),
  ]);
  if (!data) return NextResponse.json({ error: "Student not found." }, { status: 404 });

  const pdf = await renderIdCardPdf(data, settings, branding?.displayName ?? "School", branding?.logoUrl ?? null, getIdCardTemplate(settings.studentTemplate));

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="id-card-${data.idNumber}.pdf"`,
    },
  });
}
