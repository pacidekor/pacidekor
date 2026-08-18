import sharp from "sharp";
import path from "path";

const dir = "tmp/zoom-check";
const pairs = [
  ["ORIG fiala fialova", "fiala-fialova-0.jpg", "MERGED fiala kremova", "fiala-kremova-0.jpg"],
  ["ORIG fiala fialova", "fiala-fialova-0.jpg", "MERGED fiala biela", "fiala-biela-0.jpg"],
  ["ORIG fiala fialova", "fiala-fialova-0.jpg", "MERGED fiala zeleno", "fiala-zeleno-0.jpg"],
  ["ORIG mecik zlta", "mecik-zlta-0.jpg", "MERGED mecik biela-15", "mecik-biela-15.jpg"],
  ["ORIG mecik zlta", "mecik-zlta-0.jpg", "MERGED mecik biela-17", "mecik-biela-17.jpg"],
  ["ORIG voskovka fialova", "voskovka-fialova-0.jpg", "MERGED voskovka kremova", "voskovka-kremova-0.jpg"],
  ["ORIG gypso pink", "gypso-pink-0.jpg", "MERGED gypso biela", "gypso-biela-0.jpg"],
  ["ORIG chrys zlta", "chrys-zlta-0.jpg", "MERGED chrys biela", "chrys-biela-0.jpg"],
  ["ORIG chrys zlta", "chrys-zlta-0.jpg", "MERGED chrys cervena", "chrys-cervena-0.jpg"],
];

const cell = 420;
const labelH = 36;
const cols = 2;
const canvasW = cell * cols;
const canvasH = (cell + labelH) * pairs.length;

const composites = [];
for (let i = 0; i < pairs.length; i += 1) {
  const [l1, f1, l2, f2] = pairs[i];
  const y = i * (cell + labelH);
  const svg = (text) =>
    Buffer.from(
      `<svg width="${cell}" height="${labelH}"><rect width="100%" height="100%" fill="#222"/><text x="8" y="24" font-size="14" fill="#fff" font-family="Arial">${text}</text></svg>`,
    );
  composites.push({ input: svg(l1), left: 0, top: y });
  composites.push({ input: svg(l2), left: cell, top: y });
  composites.push({
    input: await sharp(path.join(dir, f1)).resize(cell, cell, { fit: "cover" }).jpeg().toBuffer(),
    left: 0,
    top: y + labelH,
  });
  composites.push({
    input: await sharp(path.join(dir, f2)).resize(cell, cell, { fit: "cover" }).jpeg().toBuffer(),
    left: cell,
    top: y + labelH,
  });
}

await sharp({
  create: { width: canvasW, height: canvasH, channels: 3, background: "#111" },
})
  .composite(composites)
  .jpeg({ quality: 70 })
  .toFile(path.join(dir, "compare.jpg"));

console.log("wrote compare.jpg");
