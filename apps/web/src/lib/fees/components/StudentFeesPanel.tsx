import { getCurrentAcademicYearId } from "@/lib/core/school/getCurrentAcademicYear";
import { getSchoolBranding } from "@/lib/core/school/getSchoolBranding";
import { getInvoicePayments, getStudentInvoices } from "@/lib/fees/queries";
import { StudentFeesList } from "@/lib/fees/components/StudentFeesList";
import type { PaymentRow } from "@/lib/fees/types";

/**
 * Server half: fetch this student's full invoice history (every academic year, see
 * getStudentInvoices) plus every invoice's payment history and the school's branding, all up
 * front -- then hand it to StudentFeesList (client) for year/month filtering and rendering.
 * Bounded per student, so fetching everything rather than re-querying per filter selection is
 * the right tradeoff here (unlike the whole-school aggregations elsewhere in this module).
 */
export async function StudentFeesPanel({ schoolId, studentId, canManage }: { schoolId: string; studentId: string; canManage: boolean }) {
  const [invoices, branding, currentAcademicYearId] = await Promise.all([
    getStudentInvoices(schoolId, studentId),
    getSchoolBranding(schoolId),
    getCurrentAcademicYearId(schoolId),
  ]);
  const schoolName = branding?.displayName ?? "School";

  const paymentEntries = await Promise.all(
    invoices.map(async (invoice): Promise<[string, PaymentRow[]]> => [invoice.invoiceId, await getInvoicePayments(invoice.invoiceId)]),
  );
  const paymentsByInvoiceId = Object.fromEntries(paymentEntries);

  return (
    <StudentFeesList
      invoices={invoices}
      paymentsByInvoiceId={paymentsByInvoiceId}
      canManage={canManage}
      schoolName={schoolName}
      currentAcademicYearId={currentAcademicYearId}
    />
  );
}
