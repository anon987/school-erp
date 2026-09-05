import { NextResponse } from "next/server";
import { getSession } from "@/lib/core/auth/session";
import { hasPermission } from "@/lib/core/auth/permissions";
import { getStudentIdCardDataForClass, getIdCardSettings } from "@/lib/idCards/queries";
import { getCurrentAcademicYearId } from "@/lib/core/school/getCurrentAcademicYear";
import { getSchoolBranding } from "@/lib/core/school/getSchoolBranding";
import { renderIdCardsBulkPdf } from "@/lib/idCards/idCardPdf";
import { getIdCardTemplate } from "@/lib/idCards/idCardTemplates";

/** One PDF, one page per enrolled student in the class -- print and cut, not a ZIP of N files. */
export async function GET(_request: Request, { params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;

  const session = await getSession();
  if (!session?.schoolId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!(await hasPermission("school.manage_students"))) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const academicYearId = await getCurrentAcademicYearId(session.schoolId);
  if (!academicYearId) return NextResponse.json({ error: "No current academic year set." }, { status: 400 });

  const [dataList, settings, branding] = await Promise.all([
    getStudentIdCardDataForClass(session.schoolId, classId, academicYearId),
    getIdCardSettings(session.schoolId),
    getSchoolBranding(session.schoolId),
  ]);
  if (dataList.length === 0) return NextResponse.json({ error: "No students enrolled in this class." }, { status: 404 });

  const pdf = await renderIdCardsBulkPdf(dataList, settings, branding?.displayName ?? "School", branding?.logoUrl ?? null, getIdCardTemplate(settings.studentTemplate));

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="id-cards-class.pdf"`,
    },
  });
}
