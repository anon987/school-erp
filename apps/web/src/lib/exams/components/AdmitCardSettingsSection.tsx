"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateAdmitCardSettingsAction } from "../admitCard.actions";
import type { AdmitCardFormState } from "../admitCard.actions";
import type { AdmitCardData } from "../admitCard.types";
import { AdmitCardView } from "./AdmitCardView";
import { DOCUMENT_TEMPLATES, type DocumentTemplateKey } from "@/lib/core/pdf/documentTemplates";

const initialState: AdmitCardFormState = {};

const PREVIEW_NATURAL_WIDTH = 640;
const PREVIEW_SCALE = 0.4;

const SAMPLE_ADMIT_CARD: AdmitCardData = {
  studentId: "sample",
  studentName: "Aarav Sharma",
  admissionNumber: "2026-0123",
  rollNumber: "17",
  className: "IX",
  sectionName: "B",
  photoUrl: null,
  examName: "Half Yearly",
  academicYearName: "2026-27",
  datesheet: [
    { subjectName: "Mathematics", examDate: "2026-11-10", startTime: "09:00:00", endTime: "12:00:00", roomNo: "12" },
    { subjectName: "Science", examDate: "2026-11-12", startTime: "09:00:00", endTime: "12:00:00", roomNo: "12" },
  ],
  hallTicketNumber: "HT-2026-0123",
  settings: {
    template: null,
    releaseEnabled: false,
    availableFrom: null,
    availableUntil: null,
    feeLockMode: "off",
    feeLockMaxDuePaise: 0,
    instructions: "Carry this admit card and a valid ID. Reach the centre 30 minutes early.",
    reportingTime: "08:30 AM",
    examCentre: "Main Campus",
    principalName: null,
    controllerOfExams: null,
    hallTicketPrefix: null,
    showStudentPhoto: true,
    showSignatureLines: true,
  },
  dueAmountPaise: 0,
  isHeld: false,
  holdReason: null,
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

/** School-wide default admit card design -- an individual exam can override it in its own Admit Card Settings. */
export function AdmitCardSettingsSection({ template, schoolName, logoUrl }: { template: string; schoolName: string; logoUrl: string | null }) {
  const [state, formAction] = useFormState(updateAdmitCardSettingsAction, initialState);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplateKey>(template as DocumentTemplateKey);

  return (
    <section className="flex flex-col gap-4 rounded-md border border-border bg-card p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Admit Card Settings</h2>
        <p className="text-sm text-muted-foreground">Pick the school-wide default design. Individual exams can use their own design and content instead.</p>
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
                <div style={{ width: PREVIEW_NATURAL_WIDTH * PREVIEW_SCALE, height: 220 }} className="overflow-hidden rounded border border-border">
                  <div style={{ width: PREVIEW_NATURAL_WIDTH, transform: `scale(${PREVIEW_SCALE})`, transformOrigin: "top left" }}>
                    <AdmitCardView data={SAMPLE_ADMIT_CARD} schoolName={schoolName} logoUrl={logoUrl} template={t} />
                  </div>
                </div>
                <span className="text-sm font-medium">{t.label}</span>
                <span className="text-xs text-muted-foreground">{t.description}</span>
              </label>
            );
          })}
        </div>

        <SaveButton />
        {state.error ? <p className="text-sm text-danger-solid">{state.error}</p> : null}
      </form>
    </section>
  );
}
