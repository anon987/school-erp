"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateReceiptDesignAction, type FeesFormState } from "../actions";
import { RECEIPT_TEMPLATES, type ReceiptTemplateKey } from "../receiptTemplates";
import type { ReceiptDetails } from "../queries";
import { ReceiptView } from "./ReceiptView";

const initialState: FeesFormState = {};

const PREVIEW_NATURAL_WIDTH = 640;
const PREVIEW_SCALE = 0.4;

const SAMPLE_RECEIPT: ReceiptDetails = {
  paymentId: "sample",
  studentId: "sample",
  receiptNumber: "RCT-00001",
  amountPaise: 17_744_00,
  method: "cash",
  status: "recorded",
  referenceNumber: null,
  createdAt: new Date().toISOString(),
  invoiceNumber: "INV-00001",
  installmentLabel: "April 2026",
  studentName: "Aarav Sharma",
  admissionNumber: "2026-0123",
  className: "IX",
  sectionName: "B",
  lineItems: [
    { feeHeadName: "Tuition Fee", amountPaise: 15_500_00, concessionAmountPaise: 0 },
    { feeHeadName: "Development Fund", amountPaise: 2_244_00, concessionAmountPaise: 0 },
  ],
  invoiceTotalPaise: 17_744_00,
  invoicePaidToDatePaise: 17_744_00,
  invoiceBalancePaise: 0,
  fatherName: "Sunil Kumar",
  primaryContactName: "Saroj Kumari",
  primaryContactRelationship: "mother",
  primaryContactPhone: "98765 43210",
  primaryContactEmail: "saroj@example.com",
};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="self-start rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save receipt design"}
    </button>
  );
}

/**
 * Every preview renders the SAME ReceiptView component real receipts use (with sample data), not
 * a separate static mockup -- what you pick here is exactly what printing/downloading produces,
 * never an approximation that could drift from it.
 */
export function ReceiptDesignSection({
  currentTemplate,
  currentWatermarkEnabled,
  logoUrl,
  schoolName,
}: {
  currentTemplate: ReceiptTemplateKey;
  currentWatermarkEnabled: boolean;
  logoUrl: string | null;
  schoolName: string;
}) {
  const [state, formAction] = useFormState(updateReceiptDesignAction, initialState);
  const [selected, setSelected] = useState<ReceiptTemplateKey>(currentTemplate);
  const [watermark, setWatermark] = useState(currentWatermarkEnabled);

  return (
    <section className="flex flex-col gap-4 rounded-md border border-border bg-card p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Receipt Design</h2>
        <p className="text-sm text-muted-foreground">
          Pick the default look for fee receipts (the HTML view and the downloadable PDF both use it).
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RECEIPT_TEMPLATES.map((t) => {
            const isSelected = selected === t.key;
            return (
              <label
                key={t.key}
                className={`flex cursor-pointer flex-col gap-2 rounded-md border p-2 ${isSelected ? "border-primary ring-1 ring-primary" : "border-border"}`}
              >
                <input
                  type="radio"
                  name="template"
                  value={t.key}
                  checked={isSelected}
                  onChange={() => setSelected(t.key)}
                  className="sr-only"
                />
                <div style={{ width: PREVIEW_NATURAL_WIDTH * PREVIEW_SCALE, height: 180 }} className="overflow-hidden rounded border border-border">
                  <div style={{ width: PREVIEW_NATURAL_WIDTH, transform: `scale(${PREVIEW_SCALE})`, transformOrigin: "top left" }}>
                    <ReceiptView receipt={SAMPLE_RECEIPT} schoolName={schoolName} logoUrl={logoUrl} template={t} watermarkEnabled={watermark} />
                  </div>
                </div>
                <span className="text-sm font-medium">{t.label}</span>
                <span className="text-xs text-muted-foreground">{t.description}</span>
              </label>
            );
          })}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="watermarkEnabled" checked={watermark} onChange={(e) => setWatermark(e.target.checked)} />
          Enable watermark (school logo, faded, behind the receipt content)
        </label>
        {!logoUrl && watermark ? (
          <p className="text-xs text-muted-foreground">No logo uploaded yet -- the watermark will only appear once one is set in Settings &gt; Branding.</p>
        ) : null}

        <SaveButton />
        {state.error ? <p className="text-sm text-danger-solid">{state.error}</p> : null}
      </form>
    </section>
  );
}
