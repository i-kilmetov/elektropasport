const MAX_SIDE = 1280;
const JPEG_QUALITY = 0.8;
const THUMB_SIDE = 112;
const THUMB_QUALITY = 0.55;

/**
 * Compress an image File to a JPEG data URL (base64) for upload.
 */
export async function fileToCompressedDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Не удалось обработать изображение");
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

/** Tiny square JPEG for list thumbnails (~112×112). */
export async function dataUrlToThumbnail(
  dataUrl: string,
  size = THUMB_SIDE,
  quality = THUMB_QUALITY,
): Promise<string> {
  const bitmap = await createImageBitmap(await (await fetch(dataUrl)).blob());
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Не удалось создать миниатюру");
  }

  const scale = Math.max(size / bitmap.width, size / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", quality);
}
