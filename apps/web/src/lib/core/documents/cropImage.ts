export interface CropPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Could not load the selected image.")));
    image.src = src;
  });
}

/**
 * Renders the cropped region (in source-image pixel coordinates, as produced by react-easy-crop's
 * onCropComplete) onto a canvas sized to the crop itself, then exports it as a Blob -- what
 * actually gets uploaded is the cropped image, not the original file.
 */
export async function getCroppedImageBlob(imageSrc: string, crop: CropPixels, mimeType = "image/jpeg"): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = crop.width;
  canvas.height = crop.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't crop images (canvas unsupported).");

  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not export the cropped image."));
      },
      mimeType,
      0.9,
    );
  });
}
