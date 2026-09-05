import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getCurrentAcademicYearId } from "@/lib/core/school/getCurrentAcademicYear";
import { getStudentMasterReport, getClassStrengthReport } from "@/lib/students/queries";
import { formatDateDisplay } from "@/lib/core/dateIst";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function StudentReportsPage() {
  const session = await requireSession();

  return (
    <RequirePermission permission="school.manage_students">
      <Body schoolId={session.schoolId!} />
    </RequirePermission>
  );
}

async function Body({ schoolId }: { schoolId: string }) {
  const academicYearId = await getCurrentAcademicYearId(schoolId);
  if (!academicYearId) {
    return (
      <div className="flex flex-col gap-4">
        <Breadcrumbs items={[{ label: "Students", href: "/people/students" }, { label: "Reports" }]} />
        <p className="text-sm text-muted-foreground">No current academic year set -- configure one in Master Data first.</p>
      </div>
    );
  }

  const [master, classStrength] = await Promise.all([getStudentMasterReport(schoolId, academicYearId), getClassStrengthReport(schoolId, academicYearId)]);
  const grandTotal = classStrength.reduce((sum, r) => sum + r.total, 0);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Students", href: "/people/students" }, { label: "Reports" }]} />
      <h1 className="text-2xl font-semibold">Student Reports</h1>

      <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Class Strength</h2>
          <a href="/api/students/reports/class-strength.csv" className="text-sm text-primary underline-offset-2 hover:underline">
            Download CSV
          </a>
        </div>
        <p className="font-figures text-sm text-muted-foreground">{grandTotal} students enrolled</p>
        {classStrength.length === 0 ? (
          <p className="text-sm text-muted-foreground">No enrolled students this academic year.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-3 py-1.5 font-medium">Class</th>
                <th className="px-3 py-1.5 font-medium">Section</th>
                <th className="px-3 py-1.5 text-right font-medium">Male</th>
                <th className="px-3 py-1.5 text-right font-medium">Female</th>
                <th className="px-3 py-1.5 text-right font-medium">Other</th>
                <th className="px-3 py-1.5 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {classStrength.map((r, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-3 py-1.5">{r.className}</td>
                  <td className="px-3 py-1.5">{r.sectionName}</td>
                  <td className="font-figures px-3 py-1.5 text-right">{r.male}</td>
                  <td className="font-figures px-3 py-1.5 text-right">{r.female}</td>
                  <td className="font-figures px-3 py-1.5 text-right">{r.other}</td>
                  <td className="font-figures px-3 py-1.5 text-right font-medium">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Student Master</h2>
          <a href="/api/students/reports/master.csv" className="text-sm text-primary underline-offset-2 hover:underline">
            Download CSV
          </a>
        </div>
        <p className="text-sm text-muted-foreground">{master.length} students -- full listing is in the CSV; showing the first 20 below.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-3 py-1.5 font-medium">Admission No.</th>
                <th className="px-3 py-1.5 font-medium">Name</th>
                <th className="px-3 py-1.5 font-medium">Class</th>
                <th className="px-3 py-1.5 font-medium">DOB</th>
                <th className="px-3 py-1.5 font-medium">Father</th>
                <th className="px-3 py-1.5 font-medium">Contact</th>
                <th className="px-3 py-1.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {master.slice(0, 20).map((r, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="font-figures px-3 py-1.5">{r.admissionNumber}</td>
                  <td className="px-3 py-1.5">
                    {r.firstName} {r.lastName}
                  </td>
                  <td className="px-3 py-1.5">
                    {r.className} - {r.sectionName}
                  </td>
                  <td className="font-figures px-3 py-1.5">{r.dob ? formatDateDisplay(r.dob) : "—"}</td>
                  <td className="px-3 py-1.5">{r.fatherName ?? "—"}</td>
                  <td className="font-figures px-3 py-1.5">{r.contactPhone ?? "—"}</td>
                  <td className="px-3 py-1.5 text-xs capitalize">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
