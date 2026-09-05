"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removePhotoAction, uploadPhotoAction } from "../actions";
import { PhotoCropperModal } from "./PhotoCropperModal";

/**
 * File select -> crop (PhotoCropperModal, preview IS the crop step -- you see the image before
 * committing) -> upload. Not `useFormState`/`<form action>`: the thing actually submitted is a
 * cropped Blob built from canvas output, not whatever the native file input holds, so this drives
 * the server action imperatively via useTransition, the same pattern MarkingClient/
 * StaffMarkingClient/ThresholdEditor already use for non-native-form submissions.
 */
export function PhotoUploadForm({ ownerType, ownerId, hasPhoto }: { ownerType: "student" | "staff"; ownerId: string; hasPhoto: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  function onFileChosen(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed.");
      return;
    }
    setError(null);
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setImageSrc(url);
  }

  function closeCropper() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setImageSrc(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleCropped(blob: Blob) {
    const file = new File([blob], "photo.jpg", { type: blob.type });
    const formData = new FormData();
    formData.set("photo", file);

    // Closes the modal immediately (the crop itself is already committed to the blob at this
    // point) rather than waiting on the network round trip -- upload progress shows as "Saving…"
    // on the trigger label instead of holding the modal open.
    closeCropper();
    // See attendance/components/MarkingClient.tsx's handleSubmit for why this is wrapped instead
    // of passed directly.
    startTransition(() => {
      void (async () => {
        const result = await uploadPhotoAction(ownerType, ownerId, {}, formData);
        if (result.error) setError(result.error);
        else router.refresh();
      })();
    });
  }

  function handleRemove() {
    setError(null);
    startTransition(() => {
      void (async () => {
        const result = await removePhotoAction(ownerType, ownerId, {}, new FormData());
        if (result.error) setError(result.error);
        else router.refresh();
      })();
    });
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <label className="cursor-pointer text-xs text-primary underline-offset-2 hover:underline">
        {isPending ? "Saving…" : hasPhoto ? "Change photo" : "Add photo"}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          disabled={isPending}
          className="hidden"
          onChange={(e) => onFileChosen(e.target.files?.[0])}
        />
      </label>
      {hasPhoto ? (
        <button
          type="button"
          onClick={handleRemove}
          disabled={isPending}
          className="text-xs text-muted-foreground hover:text-danger-solid disabled:cursor-not-allowed disabled:opacity-60"
        >
          Remove photo
        </button>
      ) : null}
      {error ? <p className="text-xs text-danger-solid">{error}</p> : null}

      {imageSrc ? <PhotoCropperModal imageSrc={imageSrc} onCancel={closeCropper} onCropped={handleCropped} /> : null}
    </div>
  );
}
