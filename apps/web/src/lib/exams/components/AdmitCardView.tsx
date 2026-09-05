import type { ReactNode } from "react";
import type { DocumentTemplateConfig } from "@/lib/core/pdf/documentTemplates";
import type { AdmitCardData } from "../admitCard.types";
import { formatDateDisplay } from "@/lib/core/dateIst";

function formatTime(t: string | null): string {
  if (!t) return "—";
  return t.slice(0, 5);
}

/**
 * HTML twin of admitCardPdf.tsx -- same shared 5-design gallery (lib/core/pdf/documentTemplates.ts)
 * receipts/report cards use, since an admit card is a full-page letterhead document, not a small
 * photo-centric card like an ID card. Used by the real admit card page and the settings gallery's
 * preview thumbnails.
 */
export function AdmitCardView({ data, schoolName, logoUrl, template }: { data: AdmitCardData; schoolName: string; logoUrl: string | null; template: DocumentTemplateConfig }) {
  const accent = template.accent;
  const isBoxed = template.style === "boxed";
  const isBand = template.style === "band";
  const borderColor = accent ?? "#1f2937";
  const { settings } = data;

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
        <span className={isBand ? "text-sm" : "text-sm text-[#64748b]"}>Admit Card — {data.examName}</span>
      </div>

      <p className="text-sm font-semibold">Hall Ticket No.: {data.hallTicketNumber}</p>

      <div className="flex gap-4">
        <div className="grid flex-1 grid-cols-2 gap-3 text-sm">
          <Field label="Student" value={data.studentName} />
          <Field label="Admission No." value={data.admissionNumber} mono />
          <Field label="Roll No." value={data.rollNumber ?? "—"} mono />
          <Field label="Class" value={data.className ? `${data.className} - ${data.sectionName}` : "—"} />
          <Field label="Academic Year" value={data.academicYearName} />
        </div>
        {settings.showStudentPhoto ? (
          <div className="flex h-[100px] w-20 shrink-0 items-center justify-center overflow-hidden bg-[#f1f5f9]" style={{ border: `1px solid ${borderColor}` }}>
            {data.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.photoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-[10px] text-[#94a3b8]">No photo</span>
            )}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm">
        {settings.reportingTime ? <span>Reporting Time: {settings.reportingTime}</span> : null}
        {settings.examCentre ? <span>Exam Centre: {settings.examCentre}</span> : null}
      </div>

      {data.datesheet.length > 0 ? (
        <table className="w-full text-sm" style={isBoxed ? { border: `1px solid ${borderColor}` } : undefined}>
          <thead>
            <tr style={isBand ? { backgroundColor: accent ?? undefined, color: "#ffffff" } : { borderBottom: `1px solid ${borderColor}` }}>
              <Th align="left">Subject</Th>
              <Th align="left">Date</Th>
              <Th align="left">Time</Th>
              <Th align="left">Room</Th>
            </tr>
          </thead>
          <tbody>
            {data.datesheet.map((row, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <Td>{row.subjectName}</Td>
                <Td>{row.examDate ? formatDateDisplay(row.examDate) : "—"}</Td>
                <Td>{row.startTime ? `${formatTime(row.startTime)} - ${formatTime(row.endTime)}` : "—"}</Td>
                <Td>{row.roomNo ?? "—"}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {settings.instructions ? <p className="whitespace-pre-line text-xs text-[#334155]">{settings.instructions}</p> : null}

      {settings.showSignatureLines ? (
        <div className="mt-8 flex justify-between text-xs text-[#64748b]">
          <div className="flex w-[30%] flex-col items-center gap-1">
            <div className="w-full border-t border-[#94a3b8]" />
            Student Signature
          </div>
          <div className="flex w-[30%] flex-col items-center gap-1">
            <div className="w-full border-t border-[#94a3b8]" />
            {settings.controllerOfExams ?? "Controller of Exams"}
          </div>
          <div className="flex w-[30%] flex-col items-center gap-1">
            <div className="w-full border-t border-[#94a3b8]" />
            {settings.principalName ?? "Principal"}
          </div>
        </div>
      ) : null}
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

function Td({ children }: { children?: ReactNode }) {
  return <td className="px-2 py-1.5 text-left">{children}</td>;
}
