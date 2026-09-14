/**
 * Build inventory of raw product folders for batch 5.9.26.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(".");
const SRC = path.join(ROOT, "katalog_raw/noveprodukty5.9.26/-III");
const OUT = path.join(ROOT, "scripts/katalog-5-9-26/inventory.json");

const EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function photoSortKey(file) {
  const of = file.match(/\((\d+)\s+of\s+\d+\)/i);
  if (of) return Number(of[1]);
  const n = file.match(/\((\d+)\)/);
  if (n) return Number(n[1]);
  return file;
}

function photoId(file) {
  const of = file.match(/\((\d+)\s+of\s+\d+\)/i);
  if (of) return of[1];
  const n = file.match(/\((\d+)\)/);
  return n ? n[1] : null;
}

const folders = fs
  .readdirSync(SRC, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^\d+$/.test(d.name))
  .map((d) => d.name)
  .sort((a, b) => Number(a) - Number(b));

const inventory = [];

for (const folder of folders) {
  const dir = path.join(SRC, folder);
  const files = fs
    .readdirSync(dir)
    .filter((f) => EXTS.has(path.extname(f).toLowerCase()))
    .sort((a, b) => {
      const ka = photoSortKey(a);
      const kb = photoSortKey(b);
      if (typeof ka === "number" && typeof kb === "number") return ka - kb;
      return String(a).localeCompare(String(b), undefined, { numeric: true });
    });

  inventory.push({
    folder,
    count: files.length,
    files: files.map((f) => ({
      file: f,
      id: photoId(f),
    })),
  });
}

fs.writeFileSync(OUT, JSON.stringify(inventory, null, 2), "utf8");
console.log(
  "folders",
  inventory.length,
  "photos",
  inventory.reduce((s, x) => s + x.count, 0),
  "->",
  OUT,
);
