/**
 * Build public/nejnovejsiprodukty-ready/{1..N}/ with WebP q=85.
 * Source: public/nejnovejsiprodukty/drive-download-.../NAHRATE day folders
 *
 * Usage: node _katalog-work/build-nejnovejsiprodukty.mjs
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const ROOT = path.resolve("public/nejnovejsiprodukty");
const OUT = path.resolve("public/nejnovejsiprodukty-ready");
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

function findDayDirs(dumpRoot) {
  return fs
    .readdirSync(dumpRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /NAHRAT/i.test(d.name))
    .map((d) => d.name)
    .sort(naturalSort);
}

function listProductFolders(dayPath) {
  return fs
    .readdirSync(dayPath, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort(naturalSort);
}

async function convertFolder(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  const images = listImages(srcDir);
  const map = [];
  let i = 0;
  for (const file of images) {
    i += 1;
    const outName = `${i}.webp`;
    const outPath = path.join(destDir, outName);
    await sharp(path.join(srcDir, file))
      .rotate()
      .webp({ quality: QUALITY })
      .toFile(outPath);
    map.push({ index: i, out: outName, source: file });
  }
  return map;
}

async function main() {
  const dumps = fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith("drive-download"))
    .map((d) => d.name)
    .sort();

  if (dumps.length === 0) {
    console.error("No drive-download folder in", ROOT);
    process.exit(1);
  }

  const dumpRoot = path.join(ROOT, dumps[0]);
  const days = findDayDirs(dumpRoot);
  if (days.length === 0) {
    console.error("No NAHRATÉ day folders in", dumpRoot);
    process.exit(1);
  }

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const manifest = [];
  let productId = 0;

  for (const day of days) {
    const dayPath = path.join(dumpRoot, day);
    const folders = listProductFolders(dayPath);
    for (const folder of folders) {
      productId += 1;
      const srcDir = path.join(dayPath, folder);
      const destDir = path.join(OUT, String(productId));
      const photos = await convertFolder(srcDir, destDir);
      const entry = {
        id: productId,
        sourceDay: day,
        sourceFolder: folder,
        photoCount: photos.length,
        photos,
        note: /dofot/i.test(folder)
          ? "Označené na dofotenie všetkých farieb"
          : undefined,
      };
      manifest.push(entry);
      console.log(
        `#${productId} <- ${day}/${folder} (${photos.length} webp)`,
      );
    }
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

  console.log("\nDONE", productId, "products ->", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
