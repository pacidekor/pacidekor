/**
 * Local-only sample of card thumbs (Etapa 4) — does NOT upload to Supabase.
 * Reads up to N public product image URLs from env catalog dump or stdin list.
 *
 * Usage:
 *   node scripts/sample-card-thumbs.mjs --urls=url1,url2 --out=tmp/card-thumbs
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2);
const urlsArg = args.find((a) => a.startsWith("--urls="));
const outArg = args.find((a) => a.startsWith("--out="));
const OUT = outArg?.slice("--out=".length) || "tmp/card-thumbs";
const CARD_W = 800;

const urls = (urlsArg?.slice("--urls=".length) || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .slice(0, 5);

if (urls.length === 0) {
  console.log(
    "Pass --urls=https://...,https://... (max 5). No upload. Writes to",
    OUT,
  );
  process.exit(0);
}

await fs.promises.mkdir(OUT, { recursive: true });

for (const [i, url] of urls.entries()) {
  const res = await fetch(url);
  if (!res.ok) {
    console.error("fail", url, res.status);
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const meta = await sharp(buf).metadata();
  const outPath = path.join(OUT, `sample-${i + 1}.webp`);
  await sharp(buf)
    .rotate()
    .resize({
      width: Math.min(meta.width ?? CARD_W, CARD_W),
      withoutEnlargement: true,
    })
    .webp({ quality: 85, effort: 4 })
    .toFile(outPath);
  const outKb = Math.round(fs.statSync(outPath).size / 1024);
  console.log(
    `${i + 1}. ${meta.width}x${meta.height} → card@${CARD_W} ${outKb} KB → ${outPath}`,
  );
}

console.log("Done. Visual QA locally; do not upload while Free Storage is full.");
