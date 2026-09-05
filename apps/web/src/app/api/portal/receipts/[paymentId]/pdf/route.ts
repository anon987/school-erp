import { NextResponse } from "next/server";
import { getPortalSession } from "@/lib/core/auth/portalSession";
import { getReceiptDetails } from "@/lib/fees/queries";
import { getSchoolBranding } from "@/lib/core/school/getSchoolBranding";
import { getSchoolProfile } from "@/lib/school-profile/queries";
import { renderReceiptPdf } from "@/lib/fees/receiptPdf";
import { getReceiptTemplate } from "@/lib/fees/receiptTemplates";
import { getLinkedStudents } from "@/lib/portal/queries";

/** Parent-facing counterpart to /api/fees/receipts/[paymentId]/pdf -- same render, guardian auth
 * instead of school.manage_fees, and the payment's student explicitly checked against the
 * caller's linked children before rendering. */
export async function GET(_request: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;

  const session = await getPortalSession();
  if (!session || session.status !== "active") return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const receipt = await getReceiptDetails(session.schoolId, paymentId);
  if (!receipt) return NextResponse.json({ error: "Receipt not found." }, { status: 404 });

  const linkedStudents = await getLinkedStudents(session.schoolId, session.guardianId);
  if (!linkedStudents.some((s) => s.id === receipt.studentId)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const [branding, profile] = await Promise.all([getSchoolBranding(session.schoolId), getSchoolProfile(session.schoolId)]);
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
