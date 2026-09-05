"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { deriveBrandTokens } from "@schoolerp/ui";
import type { SchoolBrandingRecord } from "@/lib/core/school/getSchoolBranding";
import { updateBrandingAction, type BrandingFormState } from "../actions";

const initialState: BrandingFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      Save
    </button>
  );
}

const inputClass = "rounded-md border border-input bg-background px-3 py-2 text-base";
const labelClass = "text-xs font-medium text-muted-foreground";
const fieldClass = "flex flex-col gap-1";

function Optional() {
  return <span className="font-normal normal-case text-muted-foreground"> (optional)</span>;
}

function isValidHex(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

export function BrandingForm({ branding }: { branding: SchoolBrandingRecord }) {
  const [state, formAction] = useFormState(updateBrandingAction, initialState);
  const [colorHex, setColorHex] = useState(branding.brandColorHex);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  // Preview only, no crop -- unlike the student/staff photo flow (PhotoUploadForm), a logo's
  // aspect ratio is the school's own brand asset, not something a fixed-ratio crop tool should
  // impose. This just shows what was picked before the (still-required) network round trip.
  function onLogoFileChosen(file: File | undefined) {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    if (!file) {
      objectUrlRef.current = null;
      setLogoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setLogoPreviewUrl(url);
  }

  // Same contrast-clamp math the save action runs (packages/ui/src/theme) -- the preview below
  // is exactly what saving would produce, not an approximation.
  const preview = useMemo(() => (isValidHex(colorHex) ? deriveBrandTokens(colorHex) : null), [colorHex]);

  return (
    <form action={formAction} noValidate className="flex max-w-2xl flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-md border border-border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Branding</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className={fieldClass}>
            <label htmlFor="displayName" className={labelClass}>
              Display name
            </label>
            <input id="displayName" name="displayName" required defaultValue={branding.displayName} className={inputClass} />
          </div>
          <div className={fieldClass}>
            <label htmlFor="logoFile" className={labelClass}>
              Logo
              <Optional />
            </label>
            <div className="flex items-center gap-3">
              {logoPreviewUrl || branding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoPreviewUrl ?? branding.logoUrl ?? undefined}
                  alt={logoPreviewUrl ? "Selected logo preview" : "Current logo"}
                  className="h-10 w-10 shrink-0 rounded object-contain"
                />
              ) : null}
              <input
                id="logoFile"
                name="logoFile"
                type="file"
                accept="image/*"
                onChange={(e) => onLogoFileChosen(e.target.files?.[0])}
                className="flex-1 text-sm file:mr-2 file:rounded-md file:border file:border-border file:bg-background file:px-2 file:py-1.5 file:text-sm file:hover:bg-secondary"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, WEBP, or SVG, up to 2 MB.{logoPreviewUrl ? " Previewing your selection -- not saved until you click Save." : ""}
            </p>
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">Or paste a hosted image URL instead</summary>
              <input id="logoUrl" name="logoUrl" defaultValue={branding.logoUrl ?? ""} className={`${inputClass} mt-2 w-full`} />
              <p className="mt-1">A chosen file above always takes priority over this if both are filled in.</p>
            </details>
          </div>
          <div className={`${fieldClass} sm:col-span-2`}>
            <label htmlFor="brandColorHex" className={labelClass}>
              Brand colour
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label="Pick brand colour"
                value={isValidHex(colorHex) ? colorHex : "#4F46E5"}
                onChange={(e) => setColorHex(e.target.value.toUpperCase())}
                className="h-10 w-10 shrink-0 rounded border border-input bg-background p-0.5"
              />
              <input
                id="brandColorHex"
                name="brandColorHex"
                required
                value={colorHex}
                onChange={(e) => setColorHex(e.target.value)}
                className={`${inputClass} flex-1 font-figures`}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              One hue &mdash; the button shade and light tint are derived and contrast-checked automatically.
            </p>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Preview</h2>
        {preview ? (
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="rounded-md px-4 py-2 text-sm font-medium"
              style={{ backgroundColor: `hsl(${preview.light.primary})`, color: `hsl(${preview.light.primaryForeground})` }}
            >
              Primary action
            </span>
            <span
              className="rounded-md px-4 py-2 text-sm font-medium"
              style={{ backgroundColor: `hsl(${preview.light.accent})`, color: `hsl(${preview.light.accentForeground})` }}
            >
              Selected row
            </span>
            {preview.adjustmentNote ? <p className="w-full text-xs text-muted-foreground">{preview.adjustmentNote}</p> : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Enter a valid 6-digit hex colour to see a preview.</p>
        )}
      </section>

      {state.error ? (
        <p role="alert" className="rounded-md border border-border bg-danger px-3 py-2 text-sm text-danger-foreground shadow-sm">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="rounded-md border border-border bg-success px-3 py-2 text-sm text-success-foreground shadow-sm">
          Saved.{state.adjustmentNote ? ` ${state.adjustmentNote}` : ""}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <SubmitButton />
      </div>
    </form>
  );
}
