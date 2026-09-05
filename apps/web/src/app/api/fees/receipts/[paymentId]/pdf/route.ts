import { NextResponse } from "next/server";
import { getSession } from "@/lib/core/auth/session";
import { hasPermission } from "@/lib/core/auth/permissions";
import { getReceiptDetails } from "@/lib/fees/queries";
import { getSchoolBranding } from "@/lib/core/school/getSchoolBranding";
import { getSchoolProfile } from "@/lib/school-profile/queries";
import { renderReceiptPdf } from "@/lib/fees/receiptPdf";
import { getReceiptTemplate } from "@/lib/fees/receiptTemplates";

/**
 * A real downloadable .pdf, generated server-side with @react-pdf/renderer -- distinct from the
 * printable HTML receipt page (`/finance/fees/receipts/[paymentId]`), which stays as the on-screen
 * view. Same data (getReceiptDetails), same authorization (school.manage_fees + school_id-scoped
 * lookup), just a different render target.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;

  const session = await getSession();
  if (!session?.schoolId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!(await hasPermission("school.manage_fees"))) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const [receipt, branding, profile] = await Promise.all([
    getReceiptDetails(session.schoolId, paymentId),
    getSchoolBranding(session.schoolId),
    getSchoolProfile(session.schoolId),
  ]);
  if (!receipt) return NextResponse.json({ error: "Receipt not found." }, { status: 404 });

  const template = getReceiptTemplate(branding?.receiptTemplate ?? "classic_bw");
  const pdf = await renderReceiptPdf(
    receipt,
    branding?.displayName ?? "Fee Receipt",
    branding?.logoUrl ?? null,
    template,
    branding?.receiptWatermarkEnabled ?? false,
    profile?.gstin,
  );

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="receipt-${receipt.receiptNumber ?? receipt.paymentId}.pdf"`,
    },
  });
}
