"use client";

import { uploadProductImageAction } from "@/lib/actions/products";
import { compressImageInBrowser } from "@/lib/compress-image-client";

export type AdminImageUploadResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/**
 * Compress in the browser, then upload. Server converts to WebP again
 * so products, categories and blog all store the same compact files.
 */
export async function uploadCompressedAdminImage(
  file: File,
): Promise<AdminImageUploadResult> {
  const looksLikeImage =
    file.type.startsWith("image/") || file.type === "" || file.type === "application/octet-stream";
  if (!looksLikeImage) {
    return { ok: false, error: "Nahrajte obrázok (JPG, PNG, WEBP…)." };
  }

  let toUpload = file;
  try {
    const compressed = await compressImageInBrowser(file);
    if (compressed.size > 0) toUpload = compressed;
  } catch {
    // Fall back to the original — sharp on the server can still process it.
  }

  const formData = new FormData();
  formData.set("file", toUpload);
  const result = await uploadProductImageAction(formData);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, url: result.data.url };
}
