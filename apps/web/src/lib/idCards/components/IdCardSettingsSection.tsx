"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateIdCardSettingsAction, type IdCardFormState } from "../actions";
import type { IdCardData, IdCardSettings } from "../types";
import { IdCardView } from "./IdCardView";
import { ID_CARD_TEMPLATES, type IdCardTemplateKey, type IdCardOrientation } from "../idCardTemplates";

const initialState: IdCardFormState = {};

const SAMPLE_STUDENT_ID_CARD: IdCardData = {
  personId: "sample-student",
  name: "Aarav Sharma",
  idLabel: "Admission No.",
  idNumber: "2026-0123",
  subtitle: "Class IX - B",
  fatherName: "Sunil Kumar Sharma",
  motherName: "Priya Sharma",
  rollNumber: "17",
  address: "Gopaldih, Giridih",
  contactPhone: "9876543210",
  bloodGroup: "B+",
  dob: "2011-05-15",
  photoUrl: null,
  academicYearName: "2026-27",
};

const SAMPLE_STAFF_ID_CARD: IdCardData = {
  personId: "sample-staff",
  name: "Meera Verma",
  idLabel: "Employee Code",
  idNumber: "EMP-0042",
  subtitle: "TGT, Science Department",
  fatherName: null,
  motherName: null,
  rollNumber: null,
  address: null,
  contactPhone: "9123456780",
  bloodGroup: "O+",
  dob: "1988-11-02",
  photoUrl: null,
  academicYearName: "2026-27",
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

function TemplateGallery({
  title,
  name,
  selected,
  onChange,
  sampleData,
  settings,
  schoolName,
  logoUrl,
}: {
  title: string;
  name: string;
  selected: IdCardTemplateKey;
  onChange: (key: IdCardTemplateKey) => void;
  sampleData: IdCardData;
  settings: IdCardSettings;
  schoolName: string;
  logoUrl: string | null;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ID_CARD_TEMPLATES.map((t) => {
          const isSelected = selected === t.key;
          return (
            <label
              key={t.key}
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-md border p-2 ${isSelected ? "border-primary ring-1 ring-primary" : "border-border"}`}
            >
              <input type="radio" name={name} value={t.key} checked={isSelected} onChange={() => onChange(t.key)} className="sr-only" />
              <IdCardView data={sampleData} settings={settings} schoolName={schoolName} logoUrl={logoUrl} template={t} />
              <span className="text-xs font-medium">{t.label}</span>
              <span className="text-center text-[11px] text-muted-foreground">{t.description}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

/** Same field set (and gallery) for both card types -- students and staff each pick their own design independently, since a school may want a playful look for students and a plainer one for staff. */
export function IdCardSettingsSection({ settings, schoolName, logoUrl }: { settings: IdCardSettings; schoolName: string; logoUrl: string | null }) {
  const [state, formAction] = useFormState(updateIdCardSettingsAction, initialState);
  const [studentTemplate, setStudentTemplate] = useState<IdCardTemplateKey>(settings.studentTemplate as IdCardTemplateKey);
  const [staffTemplate, setStaffTemplate] = useState<IdCardTemplateKey>(settings.staffTemplate as IdCardTemplateKey);
  const [orientation, setOrientation] = useState<IdCardOrientation>(settings.orientation);

  const previewSettings: IdCardSettings = { ...settings, orientation };

  return (
    <section className="flex flex-col gap-4 rounded-md border border-border bg-card p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">ID Card Settings</h2>
        <p className="text-sm text-muted-foreground">Pick a design for student cards and a design for staff cards, the card orientation, and which fields print.</p>
      </div>

      <form action={formAction} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">Card orientation</span>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="orientation" value="horizontal" checked={orientation === "horizontal"} onChange={() => setOrientation("horizontal")} />
              Horizontal (landscape)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="orientation" value="vertical" checked={orientation === "vertical"} onChange={() => setOrientation("vertical")} />
              Vertical (portrait)
            </label>
          </div>
        </div>

        <TemplateGallery
          title="Student card design"
          name="studentTemplate"
          selected={studentTemplate}
          onChange={setStudentTemplate}
          sampleData={SAMPLE_STUDENT_ID_CARD}
          settings={previewSettings}
          schoolName={schoolName}
          logoUrl={logoUrl}
        />

        <TemplateGallery
          title="Staff card design"
          name="staffTemplate"
          selected={staffTemplate}
          onChange={setStaffTemplate}
          sampleData={SAMPLE_STAFF_ID_CARD}
          settings={previewSettings}
          schoolName={schoolName}
          logoUrl={logoUrl}
        />

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="showFatherName" defaultChecked={settings.showFatherName} />
            Show father&apos;s name (students)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="showMotherName" defaultChecked={settings.showMotherName} />
            Show mother&apos;s name (students)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="showDob" defaultChecked={settings.showDob} />
            Show date of birth
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="showBloodGroup" defaultChecked={settings.showBloodGroup} />
            Show blood group
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="showAddress" defaultChecked={settings.showAddress} />
            Show address (students)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="showContact" defaultChecked={settings.showContact} />
            Show contact number
          </label>
        </div>

        <SaveButton />
        {state.error ? <p className="text-sm text-danger-solid">{state.error}</p> : null}
      </form>
    </section>
  );
}
