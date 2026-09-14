/**
 * Export catalog JSON → numbered ready folders with WebP + info.txt
 *
 * catalog item shape:
 * {
 *   sourceFolder: "12",
 *   name: "...",
 *   description: "...",
 *   category: "Umelé kvety",
 *   subcategory: "Stopkové kvety",
 *   druh: "Ruže",
 *   groups: [{ color: "červená", photos: ["32","33","34"] }]
 * }
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(".");
const SRC = path.join(ROOT, "katalog_raw/noveprodukty5.9.26/-III");
const OUT = path.join(ROOT, "katalog_raw/noveprodukty5.9.26-ready");
const INV = JSON.parse(
  fs.readFileSync(path.join(ROOT, "scripts/katalog-5-9-26/inventory.json"), "utf8"),
);
const CATALOG = JSON.parse(
  fs.readFileSync(path.join(ROOT, "scripts/katalog-5-9-26/catalog.json"), "utf8"),
);

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
    if (f.id) fileById[String(f.id)] = f.file;
  }

  const dest = path.join(OUT, String(idx));
  fs.mkdirSync(dest, { recursive: true });

  let imgN = 1;
  const colorLines = [];

  for (const g of p.groups) {
    const start = imgN;
    for (const ph of g.photos) {
      const file = fileById[String(ph)];
      if (!file) {
        throw new Error(`folder ${p.sourceFolder} missing photo id ${ph}`);
      }
      const src = path.join(SRC, item.folder, file);
      const outFile = path.join(dest, `${imgN}.webp`);
      await sharp(src)
        .rotate()
        .webp({
          quality: 82,
          effort: 6,
          smartSubsample: true,
        })
        .toFile(outFile);
      imgN += 1;
    }
    const end = imgN - 1;
    if (g.color) {
      colorLines.push(
        start === end
          ? `${noEm(g.color)} [${start}]`
          : `${noEm(g.color)} [${start}-${end}]`,
      );
    }
  }

  if (colorLines.length === 0) {
    colorLines.push("zelená");
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
  console.log("exported", idx, "<-", p.sourceFolder, p.name);
  idx += 1;
}

fs.writeFileSync(
  path.join(ROOT, "scripts/katalog-5-9-26/export-map.json"),
  JSON.stringify(mapLog, null, 2),
  "utf8",
);

console.log("done", mapLog.length, "products ->", OUT);
