"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateReportCardSettingsAction, type ExamsFormState } from "../actions";
import type { ReportCardData, ReportCardSettings } from "../types";
import { ReportCardView } from "./ReportCardView";
import { DOCUMENT_TEMPLATES, type DocumentTemplateKey } from "@/lib/core/pdf/documentTemplates";

const initialState: ExamsFormState = {};

const PREVIEW_NATURAL_WIDTH = 640;
const PREVIEW_SCALE = 0.4;

const SAMPLE_REPORT_CARD: ReportCardData = {
  studentId: "sample",
  studentName: "Aarav Sharma",
  admissionNumber: "2026-0123",
  className: "IX",
  sectionName: "B",
  fatherName: "Sunil Kumar",
  examName: "Half Yearly",
  academicYearName: "2026-27",
  subjects: [
    { subjectName: "Mathematics", maxMarks: 100, marksObtained: 92, internalMarksObtained: null, isAbsent: false, gradeLabel: "A1", remarks: null },
    { subjectName: "Science", maxMarks: 100, marksObtained: 78, internalMarksObtained: 15, isAbsent: false, gradeLabel: "A2", remarks: "Good effort" },
  ],
  totalObtained: 185,
  totalMax: 200,
  percentage: 92.5,
  overallGrade: "A1",
  rank: 2,
  classSize: 40,
  attendancePercent: 96,
  settings: { template: "classic_bw", showAttendance: true, showRemarks: true, showRank: true, footerNote: null },
  hpc: null,
};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="self-start rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

/** Every preview renders the same ReportCardView real report cards use (sample data) -- same "no drift between preview and output" reasoning as Fees' ReceiptDesignSection. */
export function ReportCardSettingsSection({ settings, schoolName, logoUrl }: { settings: ReportCardSettings; schoolName: string; logoUrl: string | null }) {
  const [state, formAction] = useFormState(updateReportCardSettingsAction, initialState);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplateKey>(settings.template as DocumentTemplateKey);

  return (
    <section className="flex flex-col gap-4 rounded-md border border-border bg-card p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Report Card Settings</h2>
        <p className="text-sm text-muted-foreground">Pick the default design, and which sections show -- a configurable baseline, not a template designer.</p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DOCUMENT_TEMPLATES.map((t) => {
            const isSelected = selectedTemplate === t.key;
            return (
              <label
                key={t.key}
                className={`flex cursor-pointer flex-col gap-2 rounded-md border p-2 ${isSelected ? "border-primary ring-1 ring-primary" : "border-border"}`}
              >
                <input type="radio" name="template" value={t.key} checked={isSelected} onChange={() => setSelectedTemplate(t.key)} className="sr-only" />
                <div style={{ width: PREVIEW_NATURAL_WIDTH * PREVIEW_SCALE, height: 180 }} className="overflow-hidden rounded border border-border">
                  <div style={{ width: PREVIEW_NATURAL_WIDTH, transform: `scale(${PREVIEW_SCALE})`, transformOrigin: "top left" }}>
                    <ReportCardView data={{ ...SAMPLE_REPORT_CARD, settings: { ...SAMPLE_REPORT_CARD.settings, ...settings } }} schoolName={schoolName} logoUrl={logoUrl} template={t} />
                  </div>
                </div>
                <span className="text-sm font-medium">{t.label}</span>
                <span className="text-xs text-muted-foreground">{t.description}</span>
              </label>
            );
          })}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="showAttendance" defaultChecked={settings.showAttendance} />
          Show attendance percentage
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="showRemarks" defaultChecked={settings.showRemarks} />
          Show per-subject remarks
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="showRank" defaultChecked={settings.showRank} />
          Show class rank (only for exams with "Compute ranks" enabled)
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Footer note
          <input
            name="footerNote"
            defaultValue={settings.footerNote ?? ""}
            placeholder="Optional, e.g. a promotion note"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <SaveButton />
        {state.error ? <p className="text-sm text-danger-solid">{state.error}</p> : null}
      </form>
    </section>
  );
}
