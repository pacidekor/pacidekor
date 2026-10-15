import sharp from "sharp";
import fs from "fs";
import path from "path";

const ids = [
  "001",
  "006",
  "008",
  "011",
  "012",
  "131",
  "146",
  "159",
  "176",
  "241",
  "243",
  "244",
  "247",
];
const ready = "public/910produkty-ready";
const out = "scripts/910produkty/validation-reports/spot";
fs.mkdirSync(out, { recursive: true });

for (const id of ids) {
  const dir = path.join(ready, id);
  const webps = fs
    .readdirSync(dir)
    .filter((f) => /^\d+\.webp$/i.test(f))
    .sort((a, b) => Number(a) - Number(b));
  const CELL = 220;
  const PAD = 6;
  const cols = Math.min(webps.length, 6);
  const rows = Math.ceil(webps.length / cols);
  const W = cols * CELL + (cols + 1) * PAD;
  const H = 40 + rows * CELL + (rows + 1) * PAD;
  const comps = [];
  const title = fs
    .readFileSync(path.join(dir, "info.txt"), "utf8")
    .split("\n")[0]
    .replace(/^Názov:\s*/i, "")
    .replace(/[<>&]/g, "")
    .slice(0, 70);
  const svg = Buffer.from(
    `<svg width="${W}" height="40" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#2f2924"/><text x="10" y="26" font-family="Arial" font-size="14" fill="#fff">${id} ${title}</text></svg>`,
  );
  comps.push({ input: await sharp(svg).png().toBuffer(), top: 0, left: 0 });
  for (let i = 0; i < webps.length; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const left = PAD + c * (CELL + PAD);
    const top = 40 + PAD + r * (CELL + PAD);
    const thumb = await sharp(path.join(dir, webps[i]))
      .resize(CELL, CELL, {
        fit: "contain",
        background: { r: 245, g: 242, b: 236 },
      })
      .jpeg({ quality: 70 })
      .toBuffer();
    comps.push({ input: thumb, top, left });
    const badge = Buffer.from(
      `<svg width="28" height="22" xmlns="http://www.w3.org/2000/svg"><rect width="28" height="22" rx="4" fill="#75825B"/><text x="14" y="16" text-anchor="middle" font-size="12" fill="#fff" font-family="Arial">${i + 1}</text></svg>`,
    );
    comps.push({
      input: await sharp(badge).png().toBuffer(),
      top: top + 4,
      left: left + 4,
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
    .composite(comps)
    .jpeg({ quality: 78 })
    .toFile(path.join(out, `${id}.jpg`));
  console.log("spot", id, webps.length);
}
