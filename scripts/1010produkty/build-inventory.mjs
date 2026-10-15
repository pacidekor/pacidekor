/**
 * Inventory public/NAHRATÉ 10.10.2026 → scripts/1010produkty/inventory.json
 */
import fs from "fs";
import path from "path";

const ROOT = path.resolve(".");
const OUT_DIR = path.join(ROOT, "scripts/1010produkty");

function photoSortKey(name) {
  const of = name.match(/\((\d+)\s+of\s+\d+\)/i);
  if (of) return Number(of[1]);
  const n = name.match(/\((\d+)\)/);
  if (n) return Number(n[1]);
  const lead = name.match(/^(\d+)/);
  if (lead) return Number(lead[1]);
  return 0;
}

function isImage(name) {
  return /\.(jpe?g|png|webp)$/i.test(name);
}

function isVideo(name) {
  return /\.(mp4|mov|webm|avi)$/i.test(name);
}

function findBatchRoot() {
  const pub = path.join(ROOT, "public");
  const batch = fs
    .readdirSync(pub, { withFileTypes: true })
    .find((e) => e.isDirectory() && /10\.10\.2026/.test(e.name));
  if (!batch) throw new Error("Batch folder NAHRATÉ 10.10.2026 not found under public/");
  return path.join(pub, batch.name);
}

const batchRoot = findBatchRoot();
const batchName = path.basename(batchRoot);
const products = [];

for (const groupEnt of fs
  .readdirSync(batchRoot, { withFileTypes: true })
  .filter((e) => e.isDirectory())) {
  const groupPath = path.join(batchRoot, groupEnt.name);
  const productDirs = fs
    .readdirSync(groupPath, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .sort((a, b) => Number(a.name) - Number(b.name) || a.name.localeCompare(b.name));

  for (const p of productDirs) {
    const pPath = path.join(groupPath, p.name);
    const names = fs.readdirSync(pPath).filter((n) => fs.statSync(path.join(pPath, n)).isFile());
    const images = names.filter(isImage).sort((a, b) => photoSortKey(a) - photoSortKey(b));
    const videos = names.filter(isVideo);
    products.push({
      batch: batchName,
      group: groupEnt.name,
      folder: p.name,
      path: pPath.replace(/\\/g, "/"),
      images,
      videos,
    });
  }
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(
  path.join(OUT_DIR, "inventory.json"),
  JSON.stringify(products, null, 2),
  "utf8",
);

const withImgs = products.filter((p) => p.images.length > 0);
console.log("batch", batchName);
console.log("total folders", products.length);
console.log("with images", withImgs.length);
console.log(
  "total images",
  withImgs.reduce((s, p) => s + p.images.length, 0),
);
console.log("with video", products.filter((p) => p.videos.length).length);
