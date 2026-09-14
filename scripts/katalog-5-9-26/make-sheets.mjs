/**
 * Generate contact sheets (and optional thumbs) for each raw product folder.
 * Usage: node scripts/katalog-5-9-26/make-sheets.mjs [from] [to]
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(".");
const SRC = path.join(ROOT, "katalog_raw/noveprodukty5.9.26/-III");
const SHEETS = path.join(ROOT, "scripts/katalog-5-9-26/sheets");
const THUMBS = path.join(ROOT, "scripts/katalog-5-9-26/thumbs");
const INV = JSON.parse(
  fs.readFileSync(path.join(ROOT, "scripts/katalog-5-9-26/inventory.json"), "utf8"),
);

const from = Number(process.argv[2] || 1);
const to = Number(process.argv[3] || 9999);
const THUMB = 220;
const COLS = 4;
const PAD = 8;

fs.mkdirSync(SHEETS, { recursive: true });
fs.mkdirSync(THUMBS, { recursive: true });

const items = INV.filter(
  (x) => Number(x.folder) >= from && Number(x.folder) <= to,
);

for (const item of items) {
  const folderThumbs = path.join(THUMBS, item.folder);
  fs.mkdirSync(folderThumbs, { recursive: true });

  const buffers = [];
  let i = 0;
  for (const entry of item.files) {
    i += 1;
    const src = path.join(SRC, item.folder, entry.file);
    const label = entry.id || String(i);
    const thumbPath = path.join(folderThumbs, `${label}.jpg`);

    const buf = await sharp(src)
      .rotate()
      .resize(THUMB, THUMB, { fit: "cover", position: "centre" })
      .jpeg({ quality: 72 })
      .toBuffer();

    await sharp(buf).toFile(thumbPath);

    // overlay index label
    const labeled = await sharp(buf)
      .composite([
        {
          input: Buffer.from(
            `<svg width="${THUMB}" height="28">
              <rect width="${THUMB}" height="28" fill="rgba(0,0,0,0.55)"/>
              <text x="8" y="20" font-size="16" font-family="Arial" fill="white">${item.folder} · ${label}</text>
            </svg>`,
          ),
          top: 0,
          left: 0,
        },
      ])
      .jpeg({ quality: 75 })
      .toBuffer();

    buffers.push(labeled);
  }

  const rows = Math.ceil(buffers.length / COLS);
  const width = COLS * THUMB + (COLS + 1) * PAD;
  const height = rows * THUMB + (rows + 1) * PAD + 36;

  const composites = buffers.map((input, idx) => {
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    return {
      input,
      left: PAD + col * (THUMB + PAD),
      top: 36 + PAD + row * (THUMB + PAD),
    };
  });

  const title = Buffer.from(
    `<svg width="${width}" height="36">
      <rect width="${width}" height="36" fill="#1f1a16"/>
      <text x="12" y="24" font-size="16" font-family="Arial" fill="#f5f2ec">Folder ${item.folder} · ${item.count} photos</text>
    </svg>`,
  );

  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 245, g: 242, b: 236 },
    },
  })
    .composite([{ input: title, top: 0, left: 0 }, ...composites])
    .jpeg({ quality: 80 })
    .toFile(path.join(SHEETS, `${item.folder}.jpg`));

  console.log("sheet", item.folder, item.count);
}

console.log("done", items.length, "sheets");
