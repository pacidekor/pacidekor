/**
 * Visual compare original vs display banners at CSS size × DPR 2/3.
 * Writes side-by-side crops to tmp/banner-qa-visual/
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const outDir = path.join(root, "tmp", "banner-qa-visual");
fs.mkdirSync(outDir, { recursive: true });

const pairs = [
  {
    id: "dusicky-mobile",
    // originals may live next to display/
    srcCandidates: [
      "public/bannery/bannerdusickymobile.webp",
      "public/bannery/display/../bannerdusickymobile.webp",
    ],
    display: "public/bannery/display/bannerdusickymobile.webp",
    cssWidth: 390,
    cssHeight: 195,
  },
  {
    id: "dusicky-desktop",
    srcCandidates: ["public/bannery/bannerdusickydesktop.webp"],
    display: "public/bannery/display/bannerdusickydesktop.webp",
    cssWidth: 1200,
    cssHeight: Math.round(1200 * (2515 / 12940)),
  },
  {
    id: "vsetko-mobile",
    srcCandidates: ["public/bannery/bannervsetkomobile.webp"],
    display: "public/bannery/display/bannervsetkomobile.webp",
    cssWidth: 390,
    cssHeight: 195,
  },
];

function findSrc(candidates) {
  for (const c of candidates) {
    const p = path.join(root, c);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function renderAt(file, cssW, cssH, dpr) {
  const w = Math.round(cssW * dpr);
  const h = Math.round(cssH * dpr);
  return sharp(file)
    .resize(w, h, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
}

const verdicts = [];

for (const pair of pairs) {
  const src = findSrc(pair.srcCandidates);
  const display = path.join(root, pair.display);
  if (!src || !fs.existsSync(display)) {
    verdicts.push({
      id: pair.id,
      status: "SKIP",
      reason: !src ? "missing original" : "missing display",
    });
    continue;
  }

  for (const dpr of [2, 3]) {
    const [a, b] = await Promise.all([
      renderAt(src, pair.cssWidth, pair.cssHeight, dpr),
      renderAt(display, pair.cssWidth, pair.cssHeight, dpr),
    ]);
    const metaA = await sharp(a).stats();
    const metaB = await sharp(b).stats();
    // Mean channel delta as crude quality proxy + side-by-side for human/agent view
    const meanDelta =
      Math.abs(metaA.channels[0].mean - metaB.channels[0].mean) +
      Math.abs(metaA.channels[1].mean - metaB.channels[1].mean) +
      Math.abs(metaA.channels[2].mean - metaB.channels[2].mean);

    const side = await sharp({
      create: {
        width: pair.cssWidth * dpr * 2 + 8,
        height: pair.cssHeight * dpr,
        channels: 3,
        background: { r: 40, g: 40, b: 40 },
      },
    })
      .composite([
        { input: a, left: 0, top: 0 },
        { input: b, left: pair.cssWidth * dpr + 8, top: 0 },
      ])
      .png()
      .toFile(path.join(outDir, `${pair.id}-dpr${dpr}-side.png`));

    // Center crop of text region (upper-middle) for detail check
    const cropW = Math.round(pair.cssWidth * dpr * 0.7);
    const cropH = Math.round(pair.cssHeight * dpr * 0.45);
    const left = Math.round((pair.cssWidth * dpr - cropW) / 2);
    const top = Math.round(pair.cssHeight * dpr * 0.12);
    await sharp(b)
      .extract({ left, top, width: cropW, height: cropH })
      .png()
      .toFile(path.join(outDir, `${pair.id}-dpr${dpr}-display-text.png`));
    await sharp(a)
      .extract({ left, top, width: cropW, height: cropH })
      .png()
      .toFile(path.join(outDir, `${pair.id}-dpr${dpr}-src-text.png`));

    verdicts.push({
      id: pair.id,
      dpr,
      meanChannelDelta: Number(meanDelta.toFixed(2)),
      sideBySide: `${pair.id}-dpr${dpr}-side.png`,
      sizes: { src: a.length, display: b.length },
    });
  }
}

fs.writeFileSync(
  path.join(outDir, "verdicts.json"),
  JSON.stringify(verdicts, null, 2),
);
console.log(JSON.stringify(verdicts, null, 2));
