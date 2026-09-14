/**
 * Build side-by-side comparison sheets for duplicate-name groups.
 * Reads first webp of each product in the group.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve("katalog_raw/noveprodukty5.9.26-ready-v2");
const OUT = path.resolve("scripts/katalog-5-9-26/compare-sheets");
const INV = JSON.parse(
  fs.readFileSync("scripts/katalog-5-9-26/ready-inventory.json", "utf8"),
);

const GROUPS = {
  "hlava-ruze": [11,13,14,21,24,25,28,32,34,35,36,38,43,46,47,51,53,59,60,61,62,64,71],
  "hlava-pivonie": [19,27,29,30,33,37,39,40,58,63,67,70],
  "hlava-hortenzie": [17,18,26,72,73,74,75,76],
  "hlava-dalie": [23,56,65,66,68],
  "hlava-chryzantemy": [41,55],
  "hlava-klinceka": [12,50,115],
  "hlava-iskernika": [15,16,57],
  "hlava-lilie": [22,48],
  "hlava-magnolie": [42,49],
  "hlava-kaly": [44,45],
  "articoka-stopke": [2,119,134],
  "lotosovy-plod": [77,91,94,106],
  "hviezdicovy-plod": [78,89,98,111],
  "bell-cup": [80,93,113],
  "drevene-spiralky": [81,127,180],
  "drevena-ruzicka": [83,84,116,144],
  "drevena-hlavicka": [85,87,97],
  "cedrova-ruzicka": [96,99],
  "bobulova-vetvicka": [104,123],
  "dekorativne-kalichy": [129,132],
  "satinova-stuha": [146,151,157,158,164,178,179],
  "satinova-stuha-vzor": [156,162],
  "ampulky": [160,163],
  "karovana-stuha": [173,176],
  "sušený-dekoracny": [79,95],
  "hlava-kvetu": [82,105],
  "dalie-66-68": [66,68],
};

const THUMB = 200;
const COLS = 6;
const PAD = 10;

fs.mkdirSync(OUT, { recursive: true });

for (const [key, ids] of Object.entries(GROUPS)) {
  const buffers = [];
  for (const id of ids) {
    const src = path.join(ROOT, String(id), "1.webp");
    if (!fs.existsSync(src)) {
      console.warn("missing", src);
      continue;
    }
    const item = INV.find((x) => x.id === String(id));
    const label = `${id}`;
    const buf = await sharp(src)
      .rotate()
      .resize(THUMB, THUMB, { fit: "cover", position: "centre" })
      .jpeg({ quality: 75 })
      .toBuffer();
    const labeled = await sharp(buf)
      .composite([
        {
          input: Buffer.from(
            `<svg width="${THUMB}" height="28"><rect width="${THUMB}" height="28" fill="rgba(0,0,0,0.6)"/><text x="6" y="19" font-size="14" font-family="Arial" fill="#fff">${label}</text></svg>`,
          ),
          top: 0,
          left: 0,
        },
      ])
      .jpeg({ quality: 78 })
      .toBuffer();
    buffers.push(labeled);
  }

  const rows = Math.ceil(buffers.length / COLS);
  const width = COLS * THUMB + (COLS + 1) * PAD;
  const height = rows * THUMB + (rows + 1) * PAD + 40;
  const composites = buffers.map((input, idx) => ({
    input,
    left: PAD + (idx % COLS) * (THUMB + PAD),
    top: 40 + PAD + Math.floor(idx / COLS) * (THUMB + PAD),
  }));
  const title = Buffer.from(
    `<svg width="${width}" height="40"><rect width="${width}" height="40" fill="#1f1a16"/><text x="12" y="26" font-size="16" font-family="Arial" fill="#f5f2ec">${key} (${ids.length})</text></svg>`,
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
    .jpeg({ quality: 82 })
    .toFile(path.join(OUT, `${key}.jpg`));
  console.log("sheet", key, ids.length);
}

console.log("done");
