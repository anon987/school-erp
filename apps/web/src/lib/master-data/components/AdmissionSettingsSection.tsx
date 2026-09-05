"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  createAdmissionDocumentTypeAction,
  createAdmissionStageAction,
  deleteAdmissionDocumentTypeAction,
  deleteAdmissionStageAction,
  updateAdmissionDocumentTypeAction,
  updateAdmissionStageAction,
  type MasterDataFormState,
} from "../actions";
import type { AdmissionDocumentTypeRow, AdmissionStageRow } from "../types";
import { DeleteRowButton } from "@/components/DeleteRowButton";
import { EditableText } from "./EditableText";

const initialState: MasterDataFormState = {};

const STAGE_TYPE_LABELS: Record<AdmissionStageRow["stageType"], string> = {
  in_progress: "In progress",
  admitted: "Admitted (terminal)",
  rejected: "Rejected (terminal)",
  withdrawn: "Withdrawn (terminal)",
};

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary disabled:opacity-60">
      Add
    </button>
  );
}

/**
 * Stages are configurable (name, order via creation order) but `stageType` stays a fixed
 * four-value marker -- fn_confirm_admission looks up the school's 'admitted' stage by this
 * column, never by name, so renaming "Admitted" to whatever a school calls it doesn't break
 * anything, but there must always be exactly one admitted/rejected/withdrawn stage.
 */
export function AdmissionSettingsSection({
  stages,
  documentTypes,
}: {
  stages: AdmissionStageRow[];
  documentTypes: AdmissionDocumentTypeRow[];
}) {
  const [stageState, stageFormAction] = useFormState(createAdmissionStageAction, initialState);
  const [docState, docFormAction] = useFormState(createAdmissionDocumentTypeAction, initialState);

  return (
    <section className="flex flex-col gap-6 rounded-md border border-border bg-card p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Admissions</h2>
        <p className="text-sm text-muted-foreground">Configure the enquiry-to-admission pipeline and the document checklist for applications.</p>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Pipeline stages</h3>
        {stages.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {stages.map((s) => (
              <li key={s.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm">
                <EditableText id={s.id} value={s.name} fieldName="name" updateAction={updateAdmissionStageAction} />
                <span className="text-xs text-muted-foreground">{STAGE_TYPE_LABELS[s.stageType]}</span>
                <DeleteRowButton action={deleteAdmissionStageAction.bind(null, s.id)} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">None yet.</p>
        )}

        <form action={stageFormAction} className="flex items-end gap-2 pt-1">
          <input name="name" required placeholder="e.g. Home Visit" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <select name="stageType" className="rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue="in_progress">
            <option value="in_progress">In progress</option>
            <option value="admitted">Admitted (terminal)</option>
            <option value="rejected">Rejected (terminal)</option>
            <option value="withdrawn">Withdrawn (terminal)</option>
          </select>
          <AddButton />
        </form>
        {stageState.error ? <p className="text-sm text-danger-solid">{stageState.error}</p> : null}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Document checklist</h3>
        {documentTypes.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {documentTypes.map((d) => (
              <li key={d.id} className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-sm">
                <EditableText id={d.id} value={d.name} fieldName="name" updateAction={updateAdmissionDocumentTypeAction} />
                <span className="text-xs text-muted-foreground">{d.isRequired ? "Required" : "Optional"}</span>
                <DeleteRowButton action={deleteAdmissionDocumentTypeAction.bind(null, d.id)} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">None yet.</p>
        )}

        <form action={docFormAction} className="flex items-end gap-2 pt-1">
          <input
            name="name"
            required
            placeholder="e.g. Aadhaar-free ID proof"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" name="isRequired" defaultChecked /> Required
          </label>
          <AddButton />
        </form>
        {docState.error ? <p className="text-sm text-danger-solid">{docState.error}</p> : null}
      </div>
    </section>
  );
}
