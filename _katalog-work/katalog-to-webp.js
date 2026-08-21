/**
 * Convert images in a folder to WebP (quality 85), sorted by name.
 * Usage: node scripts/katalog-to-webp.js <srcDir> <outDir>
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const QUALITY = 85;
const EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".JPG", ".JPEG", ".PNG", ".WEBP"]);

async function main() {
  const srcDir = process.argv[2];
  const outDir = process.argv[3];
  if (!srcDir || !outDir) {
    console.error("Usage: node katalog-to-webp.js <srcDir> <outDir>");
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });
  const files = fs
    .readdirSync(srcDir)
    .filter((f) => EXTS.has(path.extname(f)))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  let i = 0;
  for (const file of files) {
    i += 1;
    const inPath = path.join(srcDir, file);
    const outName = String(i).padStart(2, "0") + ".webp";
    const outPath = path.join(outDir, outName);
    await sharp(inPath)
      .rotate()
      .webp({ quality: QUALITY })
      .toFile(outPath);
    console.log(outName, "<-", file);
  }
  console.log("done", i, "files ->", outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
