import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getSchoolBranding } from "@/lib/core/school/getSchoolBranding";
import { getSchoolProfile } from "@/lib/school-profile/queries";
import { getReceiptDetails } from "@/lib/fees/queries";
import { ReceiptView } from "@/lib/fees/components/ReceiptView";
import { getReceiptTemplate } from "@/lib/fees/receiptTemplates";

/**
 * The on-screen receipt view -- renders with the school's chosen design (Fees Setup > Receipt
 * Design), via the same ReceiptView component the PDF's data maps onto and the Setup page's
 * preview gallery uses, so all three can never show three different ideas of what a given
 * template looks like. A real .pdf is generated separately by
 * /api/fees/receipts/[paymentId]/pdf (@react-pdf/renderer) for the Download button below.
 */
export default async function ReceiptPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  const session = await requireSession();

  return (
    <RequirePermission permission="school.manage_fees">
      <ReceiptBody schoolId={session.schoolId!} paymentId={paymentId} />
    </RequirePermission>
  );
}

async function ReceiptBody({ schoolId, paymentId }: { schoolId: string; paymentId: string }) {
  const [receipt, branding, profile] = await Promise.all([getReceiptDetails(schoolId, paymentId), getSchoolBranding(schoolId), getSchoolProfile(schoolId)]);
  if (!receipt) notFound();

  const template = getReceiptTemplate(branding?.receiptTemplate ?? "classic_bw");

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <a
        href={`/api/fees/receipts/${paymentId}/pdf`}
        className="flex items-center gap-2 self-end rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary print:hidden"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Download PDF
      </a>
      <div className="rounded-md shadow-sm print:shadow-none">
        <ReceiptView
          receipt={receipt}
          schoolName={branding?.displayName ?? "Fee Receipt"}
          gstin={profile?.gstin}
          logoUrl={branding?.logoUrl ?? null}
          template={template}
          watermarkEnabled={branding?.receiptWatermarkEnabled ?? false}
        />
      </div>
    </div>
  );
}
