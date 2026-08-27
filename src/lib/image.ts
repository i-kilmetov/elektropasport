const MAX_SIDE = 1280;
const JPEG_QUALITY = 0.8;

/**
 * Compress an image File to a JPEG data URL (base64) for upload.
 */
export async function fileToCompressedDataUrl(
  file: File,
  options?: { maxSide?: number; quality?: number },
): Promise<string> {
  const maxSide = options?.maxSide ?? MAX_SIDE;
  const quality = options?.quality ?? JPEG_QUALITY;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
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

  return canvas.toDataURL("image/jpeg", quality);
}

export function dataUrlToFile(dataUrl: string, filename: string): File {
  const comma = dataUrl.indexOf(",");
  const header = comma >= 0 ? dataUrl.slice(0, comma) : "";
  const payload = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const mime = /data:([^;]+)/.exec(header)?.[1] ?? "image/jpeg";
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], filename, { type: mime });
}
