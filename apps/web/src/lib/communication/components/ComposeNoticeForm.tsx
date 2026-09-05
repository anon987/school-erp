"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { composeNoticeAction, type ComposeNoticeState } from "../actions";
import type { AudienceKind, ScopeType } from "../types";
import type { NamedRow } from "@/lib/master-data/types";
import type { RoleOption } from "../queries";

const initialState: ComposeNoticeState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
    >
      Send notice
    </button>
  );
}

export function ComposeNoticeForm({ classes, roles }: { classes: (NamedRow & { sections: NamedRow[] })[]; roles: RoleOption[] }) {
  const [state, formAction] = useFormState(composeNoticeAction, initialState);
  const [audienceKind, setAudienceKind] = useState<AudienceKind>("guardians");
  const [scopeType, setScopeType] = useState<ScopeType>("whole_school");
  const [selectedClassId, setSelectedClassId] = useState("");

  const scopeOptions: { value: ScopeType; label: string }[] =
    audienceKind === "guardians"
      ? [
          { value: "whole_school", label: "Whole school" },
          { value: "class", label: "A class" },
          { value: "section", label: "A section" },
          { value: "individual", label: "One student (by admission number)" },
        ]
      : [
          { value: "whole_school", label: "Whole school" },
          { value: "role", label: "A role" },
          { value: "individual", label: "One staff member (by employee code)" },
        ];

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4 rounded-md border border-border bg-card p-4 shadow-sm">
      <label className="flex flex-col gap-1 text-sm">
        Title
        <input name="title" required className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Message
        <textarea name="body" required rows={4} className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Audience
        <select
          name="audienceKind"
          value={audienceKind}
          onChange={(e) => {
            setAudienceKind(e.target.value as AudienceKind);
            setScopeType("whole_school");
          }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="guardians">Parents / guardians</option>
          <option value="staff">Staff</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Target
        <select name="scopeType" value={scopeType} onChange={(e) => setScopeType(e.target.value as ScopeType)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          {scopeOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      {scopeType === "class" ? (
        <label className="flex flex-col gap-1 text-sm">
          Class
          <select name="scopeId" required defaultValue="" className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="" disabled>
              Select a class
            </option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {scopeType === "section" ? (
        <div className="flex gap-2">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Class
            <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Select a class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Section
            <select name="scopeId" required defaultValue="" className="rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="" disabled>
                Select a section
              </option>
              {(classes.find((c) => c.id === selectedClassId)?.sections ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {scopeType === "role" ? (
        <label className="flex flex-col gap-1 text-sm">
          Role
          <select name="scopeId" required defaultValue="" className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="" disabled>
              Select a role
            </option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {scopeType === "individual" ? (
        <label className="flex flex-col gap-1 text-sm">
          {audienceKind === "guardians" ? "Admission number" : "Employee code"}
          <input name="individualCode" required className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </label>
      ) : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Channels</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="channels" value="in_app" defaultChecked /> In-app (free)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="channels" value="sms" /> SMS
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="channels" value="whatsapp" /> WhatsApp
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="channels" value="email" /> Email
        </label>
      </fieldset>

      <div>
        <SubmitButton />
        {state.error ? <p className="mt-2 text-sm text-danger-solid">{state.error}</p> : null}
        {state.success ? <p className="mt-2 text-sm text-success-solid">Notice sent.</p> : null}
      </div>
    </form>
  );
}
