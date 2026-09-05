"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

/**
 * Preview + crop step between "picked a file" and "uploaded" -- react-easy-crop gives pan/zoom
 * over a fixed-aspect crop box (it doesn't support a freehand-resizable box), which is exactly
 * what a square avatar needs and is why this is only wired into student/staff photo upload, not
 * the school logo (an arbitrary-aspect wordmark would get mangled by a forced square crop -- the
 * logo field gets a plain preview instead, see BrandingForm.tsx).
 */
export function PhotoCropperModal({
  imageSrc,
  onCancel,
  onCropped,
}: {
  imageSrc: string;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropComplete = useCallback((_croppedArea: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  async function handleSave() {
    if (!croppedAreaPixels) return;
    setIsSaving(true);
    setError(null);
    try {
      const { getCroppedImageBlob } = await import("../cropImage");
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
      onCropped(blob);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not crop this image.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Crop photo" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-md">
        <h3 className="text-sm font-semibold">Crop photo</h3>
        <div className="relative h-64 w-full overflow-hidden rounded-md bg-secondary">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Zoom
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1"
            aria-label="Zoom"
          />
        </label>
        {error ? <p className="text-xs text-danger-solid">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !croppedAreaPixels}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving…" : "Use this photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
