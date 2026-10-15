/**
 * Thumbs + contact sheets from public/1010produkty-ready
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const ROOT = path.resolve(".");
const READY = path.join(ROOT, "public/1010produkty-ready");
const THUMBS = path.join(ROOT, "scripts/1010produkty/thumbs");
const SHEETS = path.join(ROOT, "scripts/1010produkty/sheets");
const CELL = 280;
const PAD = 6;

fs.mkdirSync(THUMBS, { recursive: true });
fs.mkdirSync(SHEETS, { recursive: true });

const dirs = fs
  .readdirSync(READY, { withFileTypes: true })
  .filter((e) => e.isDirectory() && /^\d+$/.test(e.name))
  .map((e) => e.name)
  .sort((a, b) => Number(a) - Number(b));

const manifest = [];

for (const idPad of dirs) {
  const srcDir = path.join(READY, idPad);
  const webps = fs
    .readdirSync(srcDir)
    .filter((f) => /^\d+\.webp$/i.test(f))
    .sort((a, b) => Number(a) - Number(b));

  const thumbDir = path.join(THUMBS, idPad);
  fs.mkdirSync(thumbDir, { recursive: true });

  const thumbs = [];
  for (const w of webps) {
    const idx = Number(w.replace(/\D/g, ""));
    const out = `${idx}.jpg`;
    await sharp(path.join(srcDir, w))
      .rotate()
      .resize(CELL, CELL, { fit: "contain", background: { r: 245, g: 242, b: 236 } })
      .jpeg({ quality: 72 })
      .toFile(path.join(thumbDir, out));
    thumbs.push({ sourceIndex: idx, thumb: out });
  }

  const info = fs.existsSync(path.join(srcDir, "info.txt"))
    ? fs.readFileSync(path.join(srcDir, "info.txt"), "utf8")
    : "";
  const name = (info.match(/^Názov:\s*(.*)$/m) || [])[1] || idPad;
  const folder = (info.match(/^Zdrojová zložka:\s*(.*)$/m) || [])[1] || "";

  manifest.push({
    id: Number(idPad),
    idPad,
    folder,
    name,
    imageCount: webps.length,
    thumbs,
  });

  // sheet
  const cols = Math.min(thumbs.length, 4);
  const rows = Math.ceil(thumbs.length / cols) || 1;
  const W = cols * CELL + (cols + 1) * PAD;
  const headerH = 48;
  const H = headerH + rows * CELL + (rows + 1) * PAD;
  const composites = [];
  const title = `${idPad} | src ${folder} | ${webps.length} fotiek`;
  const svg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${headerH}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#2f2924"/>
  <text x="10" y="30" font-family="Arial" font-size="16" fill="#f5f2ec">${title.replace(/[<>&]/g, "")}</text>
</svg>`);
  composites.push({ input: await sharp(svg).png().toBuffer(), top: 0, left: 0 });

  for (let i = 0; i < thumbs.length; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const left = PAD + c * (CELL + PAD);
    const top = headerH + PAD + r * (CELL + PAD);
    const buf = await sharp(path.join(thumbDir, thumbs[i].thumb))
      .resize(CELL, CELL, { fit: "contain", background: { r: 245, g: 242, b: 236 } })
      .jpeg({ quality: 70 })
      .toBuffer();
    composites.push({ input: buf, top, left });
    const badge = Buffer.from(`<?xml version="1.0"?>
<svg width="32" height="24" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="24" rx="5" fill="#75825B"/>
  <text x="16" y="16" text-anchor="middle" font-family="Arial" font-size="12" font-weight="700" fill="#fff">${thumbs[i].sourceIndex}</text>
</svg>`);
    composites.push({
      input: await sharp(badge).png().toBuffer(),
      top: top + 4,
      left: left + 4,
    });
  }

  await sharp({
    create: {
      width: Math.max(W, 200),
      height: Math.max(H, headerH + 40),
      channels: 3,
      background: { r: 232, g: 235, b: 226 },
    },
  })
    .composite(composites)
    .jpeg({ quality: 78 })
    .toFile(path.join(SHEETS, `${idPad}.jpg`));

  console.log("sheet", idPad, webps.length);
}

fs.writeFileSync(
  path.join(THUMBS, "manifest.json"),
  JSON.stringify(manifest, null, 2),
  "utf8",
);
console.log("done", manifest.length, "products");
