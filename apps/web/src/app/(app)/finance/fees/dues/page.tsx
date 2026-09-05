import Link from "next/link";
import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getCurrentAcademicYearId } from "@/lib/core/school/getCurrentAcademicYear";
import { getDefaulters } from "@/lib/fees/queries";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EmptyState } from "@/components/EmptyState";
import { CheckCircle2 } from "lucide-react";

export default async function FeesDuesPage() {
  const session = await requireSession();
  return (
    <RequirePermission permission="school.manage_fees">
      <DuesBody schoolId={session.schoolId!} />
    </RequirePermission>
  );
}

async function DuesBody({ schoolId }: { schoolId: string }) {
  const academicYearId = await getCurrentAcademicYearId(schoolId);
  const defaulters = academicYearId ? await getDefaulters(schoolId, academicYearId) : [];
  const totalDue = defaulters.reduce((sum, d) => sum + d.dueAmountPaise, 0);

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: "Fees", href: "/finance/fees" }, { label: "Dues & Defaulters" }]} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Dues &amp; Defaulters</h1>
        <div className="flex items-center gap-3">
          <span className="font-figures text-sm text-muted-foreground">
            {defaulters.length} students · ₹{(totalDue / 100).toLocaleString("en-IN")} total overdue
          </span>
          <a href="/api/fees/reports/defaulters.csv" className="text-sm text-primary underline-offset-2 hover:underline">
            Download CSV
          </a>
        </div>
      </div>

      {defaulters.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="No overdue fees" description="Every invoice past its due date has been paid or has no balance left." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary text-left text-secondary-foreground">
                <th className="px-3 py-2 font-medium">Admission No.</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Class</th>
                <th className="px-3 py-2 text-right font-medium">Overdue invoices</th>
                <th className="px-3 py-2 text-right font-medium">Amount due</th>
                <th className="px-3 py-2 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {defaulters.map((d) => (
                <tr key={d.studentId} className="border-b border-border last:border-0 hover:bg-secondary/50">
                  <td className="font-figures px-3 py-1.5">{d.admissionNumber}</td>
                  <td className="px-3 py-1.5 font-medium">
                    {d.firstName} {d.lastName}
                  </td>
                  <td className="px-3 py-1.5">
                    {d.className} - {d.sectionName}
                  </td>
                  <td className="font-figures px-3 py-1.5 text-right">{d.overdueInvoiceCount}</td>
                  <td className="font-figures px-3 py-1.5 text-right text-danger-solid">₹{(d.dueAmountPaise / 100).toLocaleString("en-IN")}</td>
                  <td className="px-3 py-1.5 text-right">
                    <Link href={`/finance/fees/collect?studentId=${d.studentId}`} className="text-sm text-primary underline-offset-2 hover:underline">
                      Collect
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
