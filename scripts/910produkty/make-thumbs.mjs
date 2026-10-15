/**
 * Make small JPEG thumbs for cataloging (first + evenly spaced photos).
 * Output: scripts/910produkty/thumbs/{id}/1.jpg …
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const ROOT = path.resolve(".");
const INV = JSON.parse(
  fs.readFileSync(path.join(ROOT, "scripts/910produkty/inventory.json"), "utf8"),
)
  .filter((p) => p.images.length > 0)
  .sort((a, b) => {
    const ka = `${a.batch}|${a.group || ""}|${a.folder}`;
    const kb = `${b.batch}|${b.group || ""}|${b.folder}`;
    return ka.localeCompare(kb, "sk", { numeric: true });
  });

const OUT = path.join(ROOT, "scripts/910produkty/thumbs");
fs.mkdirSync(OUT, { recursive: true });

function pickIndices(count) {
  if (count <= 1) return [0];
  if (count <= 3) return Array.from({ length: count }, (_, i) => i);
  if (count <= 6) return [0, 1, 2, count - 1].filter((v, i, a) => a.indexOf(v) === i);
  return [
    ...new Set([
      0,
      Math.floor((count - 1) / 4),
      Math.floor((count - 1) / 2),
      Math.floor((3 * (count - 1)) / 4),
      count - 1,
    ]),
  ].sort((a, b) => a - b);
}

const manifest = [];

for (let i = 0; i < INV.length; i++) {
  const p = INV[i];
  const id = String(i + 1).padStart(3, "0");
  const dir = path.join(OUT, id);
  fs.mkdirSync(dir, { recursive: true });
  const idxs = pickIndices(p.images.length);
  const thumbs = [];
  for (let t = 0; t < idxs.length; t++) {
    const src = path.join(p.path, p.images[idxs[t]]);
    const destName = `${t + 1}.jpg`;
    const dest = path.join(dir, destName);
    await sharp(src)
      .rotate()
      .resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 68, mozjpeg: true })
      .toFile(dest);
    thumbs.push({
      thumb: destName,
      sourceIndex: idxs[t] + 1,
      sourceFile: p.images[idxs[t]],
    });
  }
  const entry = {
    id: i + 1,
    idPad: id,
    batch: p.batch,
    group: p.group,
    folder: p.folder,
    path: p.path,
    imageCount: p.images.length,
    videos: p.videos || [],
    thumbs,
  };
  manifest.push(entry);
  fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify(entry, null, 2));
  if ((i + 1) % 25 === 0 || i === INV.length - 1) {
    console.log(`thumbs ${i + 1}/${INV.length}`);
  }
}

fs.writeFileSync(
  path.join(OUT, "manifest.json"),
  JSON.stringify(manifest, null, 2),
  "utf8",
);
console.log("done", manifest.length);
