import type { ReactNode } from "react";
import type { DocumentTemplateConfig } from "@/lib/core/pdf/documentTemplates";
import type { HpcRatingRow, ReportCardData } from "../types";

/**
 * The one shared render of a report card's content -- the real report card page and the PDF
 * (reportCardPdf.tsx) both derive from this same data shape, so they can never show different
 * numbers for the same student/exam. Always a fixed white background (like Fees receipts): a
 * report card is a printable document with its own identity, not app UI that should follow the
 * viewer's dark-mode preference. Styling varies by `template` -- same 5-design gallery as Fees
 * receipts (lib/core/pdf/documentTemplates.ts).
 */
export function ReportCardView({
  data,
  schoolName,
  logoUrl,
  template,
}: {
  data: ReportCardData;
  schoolName: string;
  logoUrl: string | null;
  template: DocumentTemplateConfig;
}) {
  const accent = template.accent;
  const isBoxed = template.style === "boxed";
  const isBand = template.style === "band";
  const borderColor = accent ?? "#1f2937";

  return (
    <div className="flex flex-col gap-4 overflow-hidden bg-white p-6 text-[#0f172a]" style={isBoxed ? { border: `2px solid ${borderColor}` } : undefined}>
      <div
        className="flex items-center justify-between gap-3 pb-3"
        style={
          isBand
            ? { backgroundColor: accent ?? undefined, color: "#ffffff", margin: "-1.5rem -1.5rem 0", padding: "1.25rem 1.5rem" }
            : { borderBottom: `1px solid ${isBoxed ? borderColor : "#cbd5e1"}` }
        }
      >
        <div className="flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-12 w-12 object-contain" />
          ) : null}
          <span className="text-lg font-semibold">{schoolName}</span>
        </div>
        <span className={isBand ? "text-sm" : "text-sm text-[#64748b]"}>Report Card</span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <Field label="Student" value={data.studentName} />
        <Field label="Admission No." value={data.admissionNumber} mono />
        <Field label="Class" value={data.className ? `${data.className} - ${data.sectionName}` : "—"} />
        <Field label="Father's Name" value={data.fatherName ?? "—"} />
        <Field label="Exam" value={data.examName} />
        <Field label="Academic Year" value={data.academicYearName} />
      </div>

      <table className="w-full text-sm" style={isBoxed ? { border: `1px solid ${borderColor}` } : undefined}>
        <thead>
          <tr style={isBand ? { backgroundColor: accent ?? undefined, color: "#ffffff" } : { borderBottom: `1px solid ${borderColor}` }}>
            <Th align="left">Subject</Th>
            <Th align="right">Max</Th>
            <Th align="right">Obtained</Th>
            <Th align="left">Grade</Th>
            {data.settings.showRemarks ? <Th align="left">Remarks</Th> : null}
          </tr>
        </thead>
        <tbody>
          {data.subjects.map((s, i) => (
            <tr key={i} style={isBoxed ? { borderBottom: `1px solid ${borderColor}` } : { borderBottom: "1px solid #e2e8f0" }}>
              <Td>{s.subjectName}</Td>
              <Td align="right" mono>
                {s.maxMarks}
              </Td>
              <Td align="right" mono>
                {s.isAbsent ? "Absent" : ((s.marksObtained ?? 0) + (s.internalMarksObtained ?? 0)).toString()}
              </Td>
              <Td>{s.gradeLabel ?? "—"}</Td>
              {data.settings.showRemarks ? <Td>{s.remarks ?? "—"}</Td> : null}
            </tr>
          ))}
          <tr style={{ fontWeight: 700, borderTop: `2px solid ${borderColor}` }}>
            <Td>Total</Td>
            <Td align="right" mono>
              {data.totalMax}
            </Td>
            <Td align="right" mono>
              {data.totalObtained}
            </Td>
            <Td>{data.overallGrade ?? "—"}</Td>
            {data.settings.showRemarks ? <Td /> : null}
          </tr>
        </tbody>
      </table>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <span className="font-figures">Percentage: {data.percentage}%</span>
        {data.settings.showRank && data.rank !== null ? (
          <span className="font-figures">
            Rank: {data.rank} of {data.classSize}
          </span>
        ) : null}
        {data.settings.showAttendance && data.attendancePercent !== null ? <span className="font-figures">Attendance: {data.attendancePercent}%</span> : null}
      </div>

      {data.hpc ? <HpcSection hpc={data.hpc} borderColor={borderColor} /> : null}

      {data.settings.footerNote ? <p className="border-t border-[#e2e8f0] pt-3 text-xs text-[#64748b]">{data.settings.footerNote}</p> : null}
    </div>
  );
}

function HpcSection({ hpc, borderColor }: { hpc: NonNullable<ReportCardData["hpc"]>; borderColor: string }) {
  return (
    <div className="flex flex-col gap-3 border-t pt-3" style={{ borderColor: "#e2e8f0" }}>
      <span className="text-sm font-semibold" style={{ color: borderColor }}>
        Holistic Progress Card
      </span>
      <HpcGroup title="Co-curricular" rows={hpc.coCurricular} />
      <HpcGroup title="Life Skills" rows={hpc.lifeSkills} />
    </div>
  );
}

function HpcGroup({ title, rows }: { title: string; rows: HpcRatingRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-[#64748b]">{title}</span>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {rows.map((r) => (
          <div key={r.criterionId} className="flex items-center justify-between gap-2">
            <span>{r.criterionName}</span>
            <span className="font-figures text-[#64748b]">{r.ratingCode ?? "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span className="text-xs font-medium text-[#64748b]">{label}</span>
      <p className={mono ? "font-figures" : ""}>{value}</p>
    </div>
  );
}

function Th({ children, align }: { children: ReactNode; align: "left" | "right" }) {
  return <th className={`px-2 py-2 font-medium ${align === "right" ? "text-right" : "text-left"}`}>{children}</th>;
}

function Td({ children, align, mono }: { children?: ReactNode; align?: "left" | "right"; mono?: boolean }) {
  return <td className={`px-2 py-1.5 ${align === "right" ? "text-right" : "text-left"} ${mono ? "font-figures" : ""}`}>{children}</td>;
}
