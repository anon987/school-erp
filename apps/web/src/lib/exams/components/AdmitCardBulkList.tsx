import Link from "next/link";
import { evaluateAdmitCardEligibility } from "../admitCard.queries";
import { AdmitCardHoldToggle } from "./AdmitCardHoldToggle";
import type { AdmitCardListRow, ExamAdmitCardSettings } from "../admitCard.types";

/** Server-rendered student list for one class+section: due amount, hold status, and per-row
 *  Generate/Hold actions -- Hold uses a plain server-action form (no client JS needed), same as
 *  the rest of this bulk-download flow. */
export function AdmitCardBulkList({
  examId,
  classId,
  sectionId,
  rows,
  settings,
}: {
  examId: string;
  classId: string;
  sectionId: string;
  rows: AdmitCardListRow[];
  settings: ExamAdmitCardSettings;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No students enrolled in this class and section.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{rows.length} student(s)</span>
        <a
          href={`/api/exams/admit-cards/${examId}/class/${classId}/section/${sectionId}/pdf`}
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Bulk Download Admit Cards
        </a>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="py-1 pr-3 font-medium">Admission No.</th>
            <th className="py-1 pr-3 font-medium">Roll No.</th>
            <th className="py-1 pr-3 font-medium">Student Name</th>
            <th className="py-1 pr-3 font-medium">Father Name</th>
            <th className="py-1 pr-3 text-right font-medium">Due</th>
            <th className="py-1 pr-3 font-medium">Status</th>
            <th className="py-1 font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const eligibility = evaluateAdmitCardEligibility(settings, r.dueAmountPaise, r.isHeld, r.holdReason);
            return (
              <tr key={r.studentId} className="border-b border-border last:border-0">
                <td className="font-figures py-1.5 pr-3">{r.admissionNumber}</td>
                <td className="font-figures py-1.5 pr-3">{r.rollNumber ?? "—"}</td>
                <td className="py-1.5 pr-3 font-medium">
                  {r.firstName} {r.lastName}
                </td>
                <td className="py-1.5 pr-3">{r.fatherName ?? "—"}</td>
                <td className="font-figures py-1.5 pr-3 text-right">₹{(r.dueAmountPaise / 100).toLocaleString("en-IN")}</td>
                <td className="py-1.5 pr-3">
                  {eligibility.blocked ? <span className="text-xs text-danger-solid">{eligibility.reason}</span> : <span className="text-xs text-success-solid">Available</span>}
                </td>
                <td className="py-1.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <AdmitCardHoldToggle examId={examId} studentId={r.studentId} isHeld={r.isHeld} />
                    {eligibility.blocked ? (
                      <span className="text-xs text-muted-foreground opacity-60">Generate</span>
                    ) : (
                      <Link href={`/api/exams/admit-cards/${examId}/student/${r.studentId}/pdf`} className="text-xs text-primary underline-offset-2 hover:underline">
                        Generate
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
