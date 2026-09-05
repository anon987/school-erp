"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateExamAdmitCardSettingsAction, type AdmitCardFormState } from "../admitCard.actions";
import type { ExamAdmitCardSettings } from "../admitCard.types";
import { DOCUMENT_TEMPLATES, type DocumentTemplateKey } from "@/lib/core/pdf/documentTemplates";

const initialState: AdmitCardFormState = {};

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

/**
 * Per-exam admit card configuration. release_enabled/available_from/available_until are stored
 * but not enforced anywhere yet -- there is no parent portal in this codebase to release admit
 * cards to. The fee lock and Hold (managed from the bulk list page) DO block generation for
 * everyone, office included.
 */
export function ExamAdmitCardSettingsForm({ examId, settings }: { examId: string; settings: ExamAdmitCardSettings }) {
  const action = updateExamAdmitCardSettingsAction.bind(null, examId);
  const [state, formAction] = useFormState(action, initialState);
  const [templateOverride, setTemplateOverride] = useState<DocumentTemplateKey | "">((settings.template as DocumentTemplateKey) ?? "");

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Admit Card Design</h2>
        <label className="flex flex-col gap-1 text-sm">
          Design used for this exam
          <select
            name="template"
            value={templateOverride}
            onChange={(e) => setTemplateOverride(e.target.value as DocumentTemplateKey | "")}
            className="w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Use the school default</option>
            {DOCUMENT_TEMPLATES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        {templateOverride ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="alsoMakeSchoolDefault" />
            Also make this the school default
          </label>
        ) : null}
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Release Control</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="releaseEnabled" defaultChecked={settings.releaseEnabled} />
          Release admit cards to parents / students
        </label>
        <p className="text-xs text-muted-foreground">
          Stored for a future parent portal release -- there is no parent-facing download yet, so this does not change anything the school office can print today.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Available from (optional)
            <input type="datetime-local" name="availableFrom" defaultValue={settings.availableFrom?.slice(0, 16) ?? ""} className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Available until (optional)
            <input type="datetime-local" name="availableUntil" defaultValue={settings.availableUntil?.slice(0, 16) ?? ""} className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Fee-Defaulter Lock</h2>
        <p className="text-xs text-muted-foreground">When set to Block, a student owing more than the limit below cannot have their admit card generated, by anyone, until the balance clears.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Lock mode
            <select name="feeLockMode" defaultValue={settings.feeLockMode} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="off">Off — no fee check</option>
              <option value="block">Block — no admit card while due exceeds the limit</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Max allowed due (₹)
            <input
              type="number"
              name="feeLockMaxDue"
              min={0}
              step="0.01"
              defaultValue={(settings.feeLockMaxDuePaise / 100).toFixed(2)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm font-figures"
            />
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Admit Card Content</h2>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Instructions for candidates
          <textarea
            name="instructions"
            rows={3}
            defaultValue={settings.instructions ?? ""}
            placeholder="e.g. Carry this admit card and a valid ID. Reach the centre 30 minutes early."
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Reporting time
            <input name="reportingTime" defaultValue={settings.reportingTime ?? ""} placeholder="09:30 AM" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Exam centre
            <input name="examCentre" defaultValue={settings.examCentre ?? ""} placeholder="Main Campus" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Principal name
            <input name="principalName" defaultValue={settings.principalName ?? ""} className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Controller of Exams
            <input name="controllerOfExams" defaultValue={settings.controllerOfExams ?? ""} className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Hall-ticket prefix (optional)
            <input name="hallTicketPrefix" defaultValue={settings.hallTicketPrefix ?? ""} placeholder="e.g. YIS2026/" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="showStudentPhoto" defaultChecked={settings.showStudentPhoto} />
          Show student photo
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="showSignatureLines" defaultChecked={settings.showSignatureLines} />
          Show signature lines
        </label>
      </section>

      <SaveButton />
      {state.error ? <p className="text-sm text-danger-solid">{state.error}</p> : null}
    </form>
  );
}
