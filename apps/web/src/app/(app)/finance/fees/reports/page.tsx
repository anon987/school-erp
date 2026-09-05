import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getCurrentAcademicYearId } from "@/lib/core/school/getCurrentAcademicYear";
import { getCollectionReport, getConcessionsReport } from "@/lib/fees/queries";
import { todayIsoIst } from "@/lib/core/dateIst";
import { Breadcrumbs } from "@/components/Breadcrumbs";

function rupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

const METHOD_LABEL: Record<string, string> = { cash: "Cash", cheque: "Cheque", upi: "UPI", online: "Online" };

export default async function FeesReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await requireSession();

  return (
    <RequirePermission permission="school.manage_fees">
      <Body schoolId={session.schoolId!} searchParams={searchParams} />
    </RequirePermission>
  );
}

async function Body({ schoolId, searchParams }: { schoolId: string; searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const today = todayIsoIst();
  const startDate = params.startDate || today.slice(0, 8) + "01";
  const endDate = params.endDate || today;

  const academicYearId = await getCurrentAcademicYearId(schoolId);
  const [collection, concessions] = await Promise.all([
    getCollectionReport(schoolId, startDate, endDate),
    academicYearId ? getConcessionsReport(schoolId, academicYearId) : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Fees", href: "/finance/fees" }, { label: "Reports" }]} />
      <h1 className="text-2xl font-semibold">Fee Reports</h1>

      <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Collection</h2>
          <a href={`/api/fees/reports/collection.csv?startDate=${startDate}&endDate=${endDate}`} className="text-sm text-primary underline-offset-2 hover:underline">
            Download CSV
          </a>
        </div>
        <form className="flex items-end gap-2" action="/finance/fees/reports">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            From
            <input type="date" name="startDate" defaultValue={startDate} className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            To
            <input type="date" name="endDate" defaultValue={endDate} className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </label>
          <button type="submit" className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary">
            Go
          </button>
        </form>

        <p className="font-figures text-sm text-muted-foreground">
          {collection.grandTotalCount} payment(s) &middot; {rupees(collection.grandTotalPaise)} total
        </p>

        {collection.byMethod.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-3 py-1.5 font-medium">Method</th>
                <th className="px-3 py-1.5 text-right font-medium">Count</th>
                <th className="px-3 py-1.5 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {collection.byMethod.map((m) => (
                <tr key={m.method} className="border-b border-border last:border-0">
                  <td className="px-3 py-1.5">{METHOD_LABEL[m.method] ?? m.method}</td>
                  <td className="font-figures px-3 py-1.5 text-right">{m.count}</td>
                  <td className="font-figures px-3 py-1.5 text-right">{rupees(m.totalPaise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted-foreground">No payments recorded in this range.</p>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Concessions</h2>
          <a href="/api/fees/reports/concessions.csv" className="text-sm text-primary underline-offset-2 hover:underline">
            Download CSV
          </a>
        </div>
        {concessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No concessions granted this academic year.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-3 py-1.5 font-medium">Admission No.</th>
                <th className="px-3 py-1.5 font-medium">Student</th>
                <th className="px-3 py-1.5 font-medium">Class</th>
                <th className="px-3 py-1.5 font-medium">Fee Head</th>
                <th className="px-3 py-1.5 text-right font-medium">Concession</th>
              </tr>
            </thead>
            <tbody>
              {concessions.map((c, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="font-figures px-3 py-1.5">{c.admissionNumber}</td>
                  <td className="px-3 py-1.5">{c.studentName}</td>
                  <td className="px-3 py-1.5">
                    {c.className} - {c.sectionName}
                  </td>
                  <td className="px-3 py-1.5">{c.feeHeadName}</td>
                  <td className="font-figures px-3 py-1.5 text-right">{rupees(c.totalConcessionPaise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
