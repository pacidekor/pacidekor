import fs from "fs";
import path from "path";

const ROOT = "public/910produkty";
const OUT_DIR = "scripts/910produkty";

function photoSortKey(name) {
  const of = name.match(/\((\d+)\s+of\s+\d+\)/i);
  if (of) return Number(of[1]);
  const n = name.match(/\((\d+)\)/);
  if (n) return Number(n[1]);
  const lead = name.match(/^(\d+)/);
  if (lead) return Number(lead[1]);
  return 0;
}

function listFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name);
}

function isImage(name) {
  return /\.(jpe?g|png|webp)$/i.test(name);
}

function isVideo(name) {
  return /\.(mp4|mov|webm|avi)$/i.test(name);
}

const products = [];

for (const batch of fs
  .readdirSync(ROOT, { withFileTypes: true })
  .filter((e) => e.isDirectory())) {
  const batchPath = path.join(ROOT, batch.name);
  const level1 = fs
    .readdirSync(batchPath, { withFileTypes: true })
    .filter((e) => e.isDirectory());

  for (const l1 of level1) {
    const l1Path = path.join(batchPath, l1.name);
    const ents = fs.readdirSync(l1Path, { withFileTypes: true });
    const filesHere = ents.filter((e) => e.isFile());
    const subdirs = ents.filter((e) => e.isDirectory());

    if (filesHere.length > 0 && subdirs.length === 0) {
      const names = filesHere.map((f) => f.name);
      const images = names.filter(isImage).sort((a, b) => photoSortKey(a) - photoSortKey(b));
      const videos = names.filter(isVideo);
      products.push({
        batch: batch.name,
        group: null,
        folder: l1.name,
        path: l1Path.replace(/\\/g, "/"),
        images,
        videos,
      });
      continue;
    }

    for (const p of subdirs) {
      const pPath = path.join(l1Path, p.name);
      const names = listFiles(pPath);
      const images = names.filter(isImage).sort((a, b) => photoSortKey(a) - photoSortKey(b));
      const videos = names.filter(isVideo);
      products.push({
        batch: batch.name,
        group: l1.name,
        folder: p.name,
        path: pPath.replace(/\\/g, "/"),
        images,
        videos,
      });
    }
  }
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(
  path.join(OUT_DIR, "inventory.json"),
  JSON.stringify(products, null, 2),
  "utf8",
);

const withImgs = products.filter((p) => p.images.length > 0);
const empty = products.filter((p) => p.images.length === 0);
const withVid = products.filter((p) => p.videos.length > 0);

console.log("total folders", products.length);
console.log("with images", withImgs.length);
console.log("empty", empty.length);
console.log("with video", withVid.length);
console.log(
  "total images",
  withImgs.reduce((s, p) => s + p.images.length, 0),
);

const by = {};
for (const p of withImgs) {
  const k = p.batch + (p.group ? " / " + p.group : "");
  by[k] = (by[k] || 0) + 1;
}
console.log("by batch/group:", by);
if (empty.length) {
  console.log(
    "empty:",
    empty.map((p) => `${p.batch}/${p.group || ""}/${p.folder}`),
  );
}
if (withVid.length) {
  console.log(
    "videos:",
    withVid.map((p) => ({
      path: p.path,
      videos: p.videos,
      images: p.images.length,
    })),
  );
}
