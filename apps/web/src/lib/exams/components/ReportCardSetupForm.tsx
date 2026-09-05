"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createReportCardSetupAction, type ReportCardSetupFormState } from "../reportCardSetup.actions";
import { DOCUMENT_TEMPLATES } from "@/lib/core/pdf/documentTemplates";
import type { ExamRow } from "../types";

const initialState: ReportCardSetupFormState = {};

interface ExamWeightRow {
  examId: string;
  weightPercent: string;
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="self-start rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving…" : "Add Combined Report Card"}
    </button>
  );
}

/** Named report-card setup combining one or more exams by weight -- weights must add to 100%,
 *  enforced again server-side (never trust client validation for a saved record). */
export function ReportCardSetupForm({ academicYearId, exams }: { academicYearId: string; exams: ExamRow[] }) {
  const action = createReportCardSetupAction.bind(null, academicYearId);
  const [state, formAction] = useFormState(action, initialState);
  const [rows, setRows] = useState<ExamWeightRow[]>([{ examId: exams[0]?.id ?? "", weightPercent: "100" }]);

  const totalWeight = rows.reduce((sum, r) => sum + (Number(r.weightPercent) || 0), 0);

  function updateRow(index: number, patch: Partial<ExamWeightRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { examId: exams[0]?.id ?? "", weightPercent: "" }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  const examsPayload = JSON.stringify(rows.filter((r) => r.examId).map((r) => ({ examId: r.examId, weightPercent: Number(r.weightPercent) || 0 })));

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
      <h2 className="text-lg font-semibold">New Combined Report Card</h2>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Name
        <input name="name" required placeholder="e.g. Annual Report" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Template
        <select name="template" defaultValue={DOCUMENT_TEMPLATES[0]!.key} className="w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm">
          {DOCUMENT_TEMPLATES.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-muted-foreground">Exams &amp; weightage</span>
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <select
              value={row.examId}
              onChange={(e) => updateRow(i, { examId: e.target.value })}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={row.weightPercent}
              onChange={(e) => updateRow(i, { weightPercent: e.target.value })}
              placeholder="%"
              className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm font-figures"
            />
            {rows.length > 1 ? (
              <button type="button" onClick={() => removeRow(i)} className="text-xs text-danger-solid underline-offset-2 hover:underline">
                Remove
              </button>
            ) : null}
          </div>
        ))}
        <button type="button" onClick={addRow} className="self-start text-xs text-primary underline-offset-2 hover:underline">
          + Add another exam
        </button>
        <span className={`text-xs ${Math.abs(totalWeight - 100) > 0.01 ? "text-danger-solid" : "text-success-solid"}`}>Total weight: {totalWeight}% (must equal 100%)</span>
      </div>

      <input type="hidden" name="exams" value={examsPayload} />

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="computeRanks" />
        Compute class rank
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="includeHpc" />
        Include Holistic Progress Card section (co-curricular &amp; life-skill ratings)
      </label>

      <SaveButton />
      {state.error ? <p className="text-sm text-danger-solid">{state.error}</p> : null}
    </form>
  );
}
