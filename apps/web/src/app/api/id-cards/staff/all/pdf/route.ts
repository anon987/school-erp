import { NextResponse } from "next/server";
import { getSession } from "@/lib/core/auth/session";
import { hasPermission } from "@/lib/core/auth/permissions";
import { getAllStaffIdCardData, getIdCardSettings } from "@/lib/idCards/queries";
import { getSchoolBranding } from "@/lib/core/school/getSchoolBranding";
import { renderIdCardsBulkPdf } from "@/lib/idCards/idCardPdf";
import { getIdCardTemplate } from "@/lib/idCards/idCardTemplates";

/** One PDF, one page per active staff member -- print and cut, not a ZIP of N files. */
export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (!session?.schoolId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!(await hasPermission("school.manage_staff"))) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const [dataList, settings, branding] = await Promise.all([
    getAllStaffIdCardData(session.schoolId),
    getIdCardSettings(session.schoolId),
    getSchoolBranding(session.schoolId),
  ]);
  if (dataList.length === 0) return NextResponse.json({ error: "No active staff." }, { status: 404 });

  const pdf = await renderIdCardsBulkPdf(dataList, settings, branding?.displayName ?? "School", branding?.logoUrl ?? null, getIdCardTemplate(settings.staffTemplate));

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="id-cards-staff.pdf"`,
    },
  });
}
