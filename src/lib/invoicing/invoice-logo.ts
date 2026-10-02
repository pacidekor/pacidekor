import "server-only";

import fs from "fs/promises";
import path from "path";

/**
 * Logo pre PDF (react-pdf). Bez `sharp` — na Vercel serverless často padá native
 * libvips binding; logo musí byť PNG/JPEG v `public/`.
 *
 * Preferuje `public/invoice-logo.png` (commitnutý PNG z wordmarku).
 * Inak null → v layoute text PACIDEKOR.
 */
export async function loadInvoiceLogoDataUrl(): Promise<string | null> {
  const candidates: Array<{ file: string; mime: string }> = [
    { file: "invoice-logo.png", mime: "image/png" },
    { file: "invoice-logo.jpg", mime: "image/jpeg" },
    { file: "logo.png", mime: "image/png" },
    { file: "logo.jpg", mime: "image/jpeg" },
  ];

  for (const { file, mime } of candidates) {
    const full = path.join(process.cwd(), "public", file);
    try {
      const buf = await fs.readFile(full);
      if (!buf.length) continue;
      return `data:${mime};base64,${buf.toString("base64")}`;
    } catch {
      // try next
    }
  }
  return null;
}
