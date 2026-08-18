"use client";

const MAX_EDGE = 1800;
const WEBP_QUALITY = 0.85;
const JPEG_QUALITY = 0.88;

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

async function decodeImage(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return await createImageBitmap(file);
  }
}

/**
 * Downscale and convert to WebP in the browser so huge PNG/JPG never hit
 * the server-action size limit. Server still re-encodes with sharp.
 */
export async function compressImageInBrowser(file: File): Promise<File> {
  const bitmap = await decodeImage(file);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas nie je dostupný.");
    }
    ctx.drawImage(bitmap, 0, 0, width, height);

    const webp = await canvasToBlob(canvas, "image/webp", WEBP_QUALITY);
    if (webp && webp.size > 0) {
      return new File([webp], "image.webp", { type: "image/webp" });
    }

    const jpeg = await canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY);
    if (jpeg && jpeg.size > 0) {
      return new File([jpeg], "image.jpg", { type: "image/jpeg" });
    }

    throw new Error("Kompresia obrázka zlyhala.");
  } finally {
    bitmap.close();
  }
}
