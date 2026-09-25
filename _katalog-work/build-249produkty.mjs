/**
 * Build public/249produkty-ready/{1..N}/ with WebP q=85.
 * Special: folder names that are not pure numbers keep their original name.
 *
 * Usage: node _katalog-work/build-249produkty.mjs
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const ROOT = path.resolve("public/249produkty");
const OUT = path.resolve("public/249produkty-ready");
const QUALITY = 85;
const EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function naturalSort(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function shotKey(filename) {
  const m = filename.match(/\((\d+)\s+of\s+\d+\)/i);
  if (m) return Number(m[1]);
  return filename;
}

function listImages(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => EXTS.has(path.extname(f).toLowerCase()))
    .sort((a, b) => {
      const ka = shotKey(a);
      const kb = shotKey(b);
      if (typeof ka === "number" && typeof kb === "number") return ka - kb;
      return naturalSort(String(ka), String(kb));
    });
}

function findSourceRoot() {
  const top = fs.readdirSync(ROOT, { withFileTypes: true });
  const day = top.find((d) => d.isDirectory() && /NAHRAT/i.test(d.name));
  if (day) return path.join(ROOT, day.name);
  return ROOT;
}

function listProductFolders(srcRoot) {
  return fs
    .readdirSync(srcRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort(naturalSort);
}

/** Ready folder name: pure numbers stay "1","2"; special names keep original. */
function readyFolderName(sourceFolder, sequentialId) {
  if (/^\d+$/.test(sourceFolder.trim())) return String(sequentialId);
  // keep special name as-is (e.g. "39 chýbajúce pivone b,h,o")
  return sourceFolder;
}

async function convertFolder(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  const images = listImages(srcDir);
  const map = [];
  let i = 0;
  for (const file of images) {
    i += 1;
    const outName = `${i}.webp`;
    await sharp(path.join(srcDir, file))
      .rotate()
      .webp({ quality: QUALITY })
      .toFile(path.join(destDir, outName));
    map.push({ index: i, out: outName, source: file });
  }
  return map;
}

async function main() {
  const srcRoot = findSourceRoot();
  const folders = listProductFolders(srcRoot);
  if (folders.length === 0) {
    console.error("No product folders in", srcRoot);
    process.exit(1);
  }

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const manifest = [];
  let productId = 0;

  for (const folder of folders) {
    productId += 1;
    const readyName = readyFolderName(folder, productId);
    const srcDir = path.join(srcRoot, folder);
    const destDir = path.join(OUT, readyName);
    const photos = await convertFolder(srcDir, destDir);
    const entry = {
      id: productId,
      sourceFolder: folder,
      readyFolder: readyName,
      photoCount: photos.length,
      photos,
      note: /pivon|chyb/i.test(folder)
        ? "Špeciálny názov zložky zachovaný (chýbajúce pivónie)"
        : undefined,
    };
    manifest.push(entry);
    console.log(`#${productId} <- ${folder} → ${readyName}/ (${photos.length} webp)`);
  }

  fs.writeFileSync(
    path.join(OUT, "_manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8",
  );
  fs.writeFileSync(
    path.join(ROOT, "_manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8",
  );

  // id → ready folder map
  const folderMap = {};
  for (const m of manifest) folderMap[m.id] = m.readyFolder;
  fs.writeFileSync(
    path.join(OUT, "_folder-map.json"),
    JSON.stringify(folderMap, null, 2),
    "utf8",
  );

  console.log("\nDONE", productId, "products ->", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
