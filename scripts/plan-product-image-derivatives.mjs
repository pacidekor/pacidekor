/**
 * Dry-run planner for product image derivatives (Etapa 4).
 * Does NOT download, resize, or upload. Prints counts + capacity estimate.
 *
 * Sizes (CSS × typical DPR, without upscaling beyond source):
 *   card   — 800px  (≈ 280–400 CSS @ 2–3x, product grid)
 *   detail — 1600px (≈ PDP main / gallery)
 *   zoom   — keep original URL (no duplicate) unless source > 2400px then cap
 *
 * Usage: node scripts/plan-product-image-derivatives.mjs
 * Requires SUPABASE_URL + SUPABASE_ANON_KEY (or NEXT_PUBLIC_*) in env / .env.local
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

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

if (!url || !key) {
  console.error("Missing Supabase URL/anon key in env.");
  process.exit(1);
}

const CARD_W = 800;
const DETAIL_W = 1600;
/** Rough avg bytes after WebP for planning only — not a quality claim. */
const AVG_CARD_KB = 45;
const AVG_DETAIL_KB = 120;

async function main() {
  const endpoint = `${url.replace(/\/$/, "")}/rest/v1/products?select=images`;
  const res = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });
  if (!res.ok) {
    console.error("Fetch failed", res.status, await res.text());
    process.exit(1);
  }
  const rows = await res.json();
  const unique = new Set();
  for (const row of rows) {
    const images = Array.isArray(row.images) ? row.images : [];
    for (const img of images) {
      if (typeof img === "string" && img.trim()) unique.add(img.trim());
    }
  }

  const n = unique.size;
  const cardMb = (n * AVG_CARD_KB) / 1024;
  const detailMb = (n * AVG_DETAIL_KB) / 1024;

  console.log(`Products rows: ${rows.length}`);
  console.log(`Unique image URLs: ${n}`);
  console.log(`Proposed derivatives (new files, originals kept):`);
  console.log(`  card@${CARD_W}px   ≈ ${cardMb.toFixed(0)} MB (avg ${AVG_CARD_KB} KB)`);
  console.log(`  detail@${DETAIL_W}px ≈ ${detailMb.toFixed(0)} MB (avg ${AVG_DETAIL_KB} KB)`);
  console.log(`  zoom             = original URL (no extra storage)`);
  console.log(`Total extra Storage estimate: ≈ ${(cardMb + detailMb).toFixed(0)} MB`);
  console.log(`Supabase Free Storage is limited — confirm headroom before bulk upload.`);
  console.log(`Next: sample 5–10 images locally, visual QA, then approve upload.`);
  console.log(`Dry-run only — no files written.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
