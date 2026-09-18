import "server-only";

import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

/**
 * Logo pre PDF. Preferuje `public/pacidekor logo.webp`.
 * Inak null → v layoute sa použije text PACIDEKOR.
 */
export async function loadInvoiceLogoDataUrl(): Promise<string | null> {
  const candidates = [
    "pacidekor logo.webp",
    "invoice-logo.png",
    "invoice-logo.webp",
    "logo.png",
    "logo.webp",
  ];

  for (const file of candidates) {
    const full = path.join(process.cwd(), "public", file);
    try {
      const buf = await fs.readFile(full);
      const png = await sharp(buf).png().toBuffer();
      return `data:image/png;base64,${png.toString("base64")}`;
    } catch {
      // try next
    }
  }
  return null;
}
