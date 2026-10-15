/**
 * One contact sheet per product from thumbs (faster visual cataloging).
 * Output: scripts/910produkty/sheets/{id}.jpg + chunks JSON lists
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const ROOT = path.resolve(".");
const MANIFEST = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, "scripts/910produkty/thumbs/manifest.json"),
    "utf8",
  ),
);
const THUMBS = path.join(ROOT, "scripts/910produkty/thumbs");
const SHEETS = path.join(ROOT, "scripts/910produkty/sheets");
const CHUNKS = path.join(ROOT, "scripts/910produkty/chunks");
fs.mkdirSync(SHEETS, { recursive: true });
fs.mkdirSync(CHUNKS, { recursive: true });

const CELL = 320;
const PAD = 8;

for (const p of MANIFEST) {
  const imgs = [];
  for (const t of p.thumbs) {
    const buf = await sharp(path.join(THUMBS, p.idPad, t.thumb))
      .resize(CELL, CELL, { fit: "contain", background: { r: 245, g: 242, b: 236 } })
      .jpeg({ quality: 70 })
      .toBuffer();
    imgs.push({ buf, label: String(t.sourceIndex) });
  }
  const cols = Math.min(imgs.length, 3);
  const rows = Math.ceil(imgs.length / cols);
  const W = cols * CELL + (cols + 1) * PAD;
  const headerH = 56;
  const H = headerH + rows * CELL + (rows + 1) * PAD;

  const composites = [];
  const title = `${p.idPad} | ${p.folder} | ${p.imageCount} fotiek${p.videos?.length ? " +VIDEO" : ""}`;
  const svg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${headerH}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#2f2924"/>
  <text x="12" y="34" font-family="Arial" font-size="18" fill="#f5f2ec">${title.replace(/[<>&]/g, "")}</text>
</svg>`);
  composites.push({ input: await sharp(svg).png().toBuffer(), top: 0, left: 0 });

  for (let i = 0; i < imgs.length; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const left = PAD + c * (CELL + PAD);
    const top = headerH + PAD + r * (CELL + PAD);
    composites.push({ input: imgs[i].buf, top, left });
    const badge = Buffer.from(`<?xml version="1.0"?>
<svg width="36" height="28" xmlns="http://www.w3.org/2000/svg">
  <rect width="36" height="28" rx="6" fill="#75825B"/>
  <text x="18" y="19" text-anchor="middle" font-family="Arial" font-size="14" font-weight="700" fill="#fff">${imgs[i].label}</text>
</svg>`);
    composites.push({
      input: await sharp(badge).png().toBuffer(),
      top: top + 6,
      left: left + 6,
    });
  }

  await sharp({
    create: {
      width: W,
      height: H,
      channels: 3,
      background: { r: 232, g: 235, b: 226 },
    },
  })
    .composite(composites)
    .jpeg({ quality: 75 })
    .toFile(path.join(SHEETS, `${p.idPad}.jpg`));

  if (p.id % 40 === 0) console.log("sheets", p.id);
}

console.log("sheets done", MANIFEST.length);

// split into chunks of 20
const size = 20;
const chunks = [];
for (let i = 0; i < MANIFEST.length; i += size) {
  const slice = MANIFEST.slice(i, i + size);
  const chunkId = String(chunks.length + 1).padStart(2, "0");
  const list = slice.map((p) => ({
    id: p.id,
    idPad: p.idPad,
    folder: p.folder,
    batch: p.batch,
    group: p.group,
    path: p.path,
    imageCount: p.imageCount,
    videos: p.videos,
    sheet: `scripts/910produkty/sheets/${p.idPad}.jpg`,
    thumbMeta: `scripts/910produkty/thumbs/${p.idPad}/meta.json`,
  }));
  fs.writeFileSync(
    path.join(CHUNKS, `chunk-${chunkId}.json`),
    JSON.stringify(list, null, 2),
  );
  chunks.push(chunkId);
}
fs.writeFileSync(
  path.join(CHUNKS, "index.json"),
  JSON.stringify({ chunkSize: size, chunks }, null, 2),
);
console.log("chunks", chunks.length);
