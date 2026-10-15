/**
 * Read-only classification of product image URLs (no Storage writes/deletes).
 * Separates card thumbs vs gallery extras; flags already-small originals.
 */
import fs from "node:fs";
import path from "node:path";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i < 0) continue;
    const key = trimmed.slice(0, i).trim();
    let val = trimmed.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const res = await fetch(
  `${url.replace(/\/$/, "")}/rest/v1/products?select=id,images,color_image_map`,
  { headers: { apikey: key, Authorization: `Bearer ${key}` } },
);
if (!res.ok) {
  console.error(await res.text());
  process.exit(1);
}
const rows = await res.json();

/** @type {Map<string, { card: boolean, hover: boolean, gallery: boolean, colorVariant: boolean }>} */
const usage = new Map();

function touch(u, patch) {
  if (!u || typeof u !== "string") return;
  const cur = usage.get(u) ?? {
    card: false,
    hover: false,
    gallery: false,
    colorVariant: false,
  };
  usage.set(u, { ...cur, ...patch });
}

for (const row of rows) {
  const images = Array.isArray(row.images) ? row.images.filter(Boolean) : [];
  if (images[0]) touch(images[0], { card: true });
  if (images[1]) touch(images[1], { hover: true });
  for (let i = 2; i < images.length; i++) touch(images[i], { gallery: true });

  const map = row.color_image_map;
  if (map && typeof map === "object") {
    for (const idxs of Object.values(map)) {
      if (!Array.isArray(idxs)) continue;
      for (const idx of idxs) {
        if (typeof idx === "number" && images[idx]) {
          touch(images[idx], { colorVariant: true });
        }
      }
    }
  }
}

let cardOnly = 0;
let cardOrHover = 0;
let galleryOnly = 0;
let multiRole = 0;
for (const meta of usage.values()) {
  const roles = [meta.card, meta.hover, meta.gallery, meta.colorVariant].filter(
    Boolean,
  ).length;
  if (meta.card || meta.hover) cardOrHover += 1;
  if (meta.card && !meta.hover && !meta.gallery && !meta.colorVariant) {
    cardOnly += 1;
  }
  if (meta.gallery && !meta.card && !meta.hover) galleryOnly += 1;
  if (roles > 1) multiRole += 1;
}

console.log(
  JSON.stringify(
    {
      products: rows.length,
      uniqueUrls: usage.size,
      usedAsCardPrimary: [...usage.values()].filter((m) => m.card).length,
      usedAsHover: [...usage.values()].filter((m) => m.hover).length,
      usedAsGalleryExtra: [...usage.values()].filter((m) => m.gallery).length,
      usedInColorMap: [...usage.values()].filter((m) => m.colorVariant).length,
      cardOrHover,
      cardOnly,
      galleryOnly,
      multiRole,
      note:
        "Cleanup candidates must cross-check ALL roles before deletion. No files changed.",
      storageBlocker:
        "Free Storage ~full (~1015MB/1GB). Do not bulk-upload card+detail derivatives (~643MB estimate).",
      recommendation:
        "Prefer card@800 only for card/hover URLs if capacity frees; keep originals for gallery/zoom when already adequate.",
    },
    null,
    2,
  ),
);
