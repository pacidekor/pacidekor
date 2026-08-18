/**
 * Export selected photos to numbered product folders + WebP (sharp, squoosh-like).
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(".");
const SRC = path.join(ROOT, "public/products/pacikvetynove");
const OUT = path.join(ROOT, "public/products/paci-kvety-nove-ready");
const INV = JSON.parse(
  fs.readFileSync(path.join(ROOT, "scripts/paci-nove/inventory.json"), "utf8"),
);
const CATALOG = JSON.parse(
  fs.readFileSync(path.join(ROOT, "scripts/paci-nove/catalog.json"), "utf8"),
);

function photoId(file) {
  const of = file.match(/\((\d+)\s+of\s+\d+\)/i);
  if (of) return of[1];
  const n = file.match(/\((\d+)\)/);
  return n ? n[1] : null;
}

function noEm(s) {
  return String(s || "")
    .replace(/[\u2013\u2014\u2015]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

const invByFolder = Object.fromEntries(
  INV.map((x) => [String(x.folder), x]),
);

fs.mkdirSync(OUT, { recursive: true });

const products = [...CATALOG].sort(
  (a, b) => Number(a.sourceFolder) - Number(b.sourceFolder),
);

let idx = 1;
const mapLog = [];

for (const p of products) {
  const item = invByFolder[String(p.sourceFolder)];
  if (!item) throw new Error("missing inventory " + p.sourceFolder);
  const fileById = {};
  for (const f of item.files) {
    const id = photoId(f);
    if (id) fileById[id] = f;
  }

  const dest = path.join(OUT, String(idx));
  fs.mkdirSync(dest, { recursive: true });

  let imgN = 1;
  const colorLines = [];
  for (const g of p.groups) {
    const start = imgN;
    for (const ph of g.photos) {
      const file = fileById[String(ph)];
      if (!file) throw new Error(`folder ${p.sourceFolder} missing ${ph}`);
      const src = path.join(SRC, item.folder, file);
      const outFile = path.join(dest, `${imgN}.webp`);
      await sharp(src)
        .rotate()
        .webp({
          quality: 80,
          effort: 6,
          smartSubsample: true,
        })
        .toFile(outFile);
      imgN += 1;
    }
    const end = imgN - 1;
    colorLines.push(`${noEm(g.color)} [${start}-${end}]`);
  }

  const info = [
    `Názov: ${noEm(p.name)}`,
    `Popis: ${noEm(p.description)}`,
    `Farby: ${colorLines.join(" | ")}`,
    `Druh: ${noEm(p.druh)}`,
    `Kategória: ${noEm(p.category)}`,
    `Subkategória: ${noEm(p.subcategory)}`,
    `Zdrojová zložka: ${p.sourceFolder}`,
  ].join("\n");

  fs.writeFileSync(path.join(dest, "info.txt"), info + "\n", "utf8");
  mapLog.push({
    out: idx,
    source: p.sourceFolder,
    name: p.name,
    images: imgN - 1,
  });
  idx += 1;
}

fs.writeFileSync(
  path.join(ROOT, "scripts/paci-nove/export-map.json"),
  JSON.stringify(mapLog, null, 2),
);

console.log("exported", mapLog.length, "products to", OUT);
