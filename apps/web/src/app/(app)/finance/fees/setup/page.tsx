import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getPermissions } from "@/lib/core/auth/permissions";
import { getCurrentAcademicYearId } from "@/lib/core/school/getCurrentAcademicYear";
import { getSchoolBranding } from "@/lib/core/school/getSchoolBranding";
import {
  getCategoryOptions,
  getClassOptions,
  getConcessionRules,
  getFeeHeads,
  getFeeStructures,
  getInstallments,
  getUninvoicedStudentCount,
} from "@/lib/fees/queries";
import { FeeHeadsSection } from "@/lib/fees/components/FeeHeadsSection";
import { FeeStructuresSection } from "@/lib/fees/components/FeeStructuresSection";
import { ConcessionRulesSection } from "@/lib/fees/components/ConcessionRulesSection";
import { InvoiceGenerationPanel } from "@/lib/fees/components/InvoiceGenerationPanel";
import { ReceiptDesignSection } from "@/lib/fees/components/ReceiptDesignSection";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function FeesSetupPage() {
  const session = await requireSession();

  return (
    <RequirePermission permission="school.manage_fees">
      <FeesSetupBody schoolId={session.schoolId!} />
    </RequirePermission>
  );
}

async function FeesSetupBody({ schoolId }: { schoolId: string }) {
  const academicYearId = await getCurrentAcademicYearId(schoolId);
  if (!academicYearId) {
    return <p className="text-sm text-muted-foreground">No current academic year set -- configure one in Master Data first.</p>;
  }

  const [feeHeads, structures, rules, classes, categories, installments, uninvoicedCount, permissions, branding] = await Promise.all([
    getFeeHeads(schoolId),
    getFeeStructures(schoolId, academicYearId),
    getConcessionRules(schoolId, academicYearId),
    getClassOptions(schoolId),
    getCategoryOptions(schoolId),
    getInstallments(schoolId, academicYearId),
    getUninvoicedStudentCount(schoolId, academicYearId),
    getPermissions(),
    getSchoolBranding(schoolId),
  ]);
  const canManageBranding = permissions.includes("school.manage_branding");

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Fees", href: "/finance/fees" }, { label: "Setup" }]} />
      <h1 className="text-2xl font-semibold">Fees Setup</h1>
      <p className="text-sm text-muted-foreground">
        Set this up once per academic year, in order: fee heads, then structures per class, then concession rules if needed, then generate the
        installment schedule and invoices.
      </p>

      <FeeHeadsSection feeHeads={feeHeads} />
      <FeeStructuresSection structures={structures} feeHeads={feeHeads} classes={classes} categories={categories} />
      <ConcessionRulesSection rules={rules} feeHeads={feeHeads} categories={categories} />
      <InvoiceGenerationPanel uninvoicedCount={uninvoicedCount} hasInstallments={installments.length > 0} classes={classes} />
      {canManageBranding && branding ? (
        <ReceiptDesignSection
          currentTemplate={branding.receiptTemplate}
          currentWatermarkEnabled={branding.receiptWatermarkEnabled}
          logoUrl={branding.logoUrl}
          schoolName={branding.displayName}
        />
      ) : null}
    </div>
  );
}
