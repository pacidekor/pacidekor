/**
 * In-place: convert all JPG/PNG in Paci Kvety → WebP, then delete originals.
 *
 *   node scripts/compress-paci-kvety-inplace.mjs
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve("public/products/Paci Kvety");
const SOURCE_EXT = new Set([".jpg", ".jpeg", ".png", ".tif", ".tiff"]);
const MAX_EDGE = 1800;
const WEBP_QUALITY = 82;
const CONCURRENCY = 6;

function collectImages(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectImages(full, out);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (SOURCE_EXT.has(ext)) out.push(full);
  }
  return out;
}

async function convertOne(src) {
  const dir = path.dirname(src);
  const base = path.basename(src, path.extname(src));
  const dest = path.join(dir, `${base}.webp`);
  const bytesIn = fs.statSync(src).size;

  await sharp(src, { failOn: "none" })
    .rotate()
    .resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toFile(dest);

  // Don't delete if source was somehow already the dest path
  if (path.resolve(src) !== path.resolve(dest)) {
    fs.unlinkSync(src);
  }

  const bytesOut = fs.statSync(dest).size;
  return { src, dest, bytesIn, bytesOut };
}

async function mapPool(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const i = next;
      next += 1;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => run()),
  );
  return results;
}

async function main() {
  if (!fs.existsSync(ROOT)) {
    console.error("Missing folder:", ROOT);
    process.exit(1);
  }

  const images = collectImages(ROOT);
  console.log(`Found ${images.length} images to convert…`);

  let done = 0;
  let bytesIn = 0;
  let bytesOut = 0;
  const failed = [];

  await mapPool(images, CONCURRENCY, async (src) => {
    try {
      const result = await convertOne(src);
      bytesIn += result.bytesIn;
      bytesOut += result.bytesOut;
      done += 1;
      if (done % 25 === 0 || done === images.length) {
        const saved = ((1 - bytesOut / Math.max(bytesIn, 1)) * 100).toFixed(1);
        console.log(
          `  ${done}/${images.length}  saved ~${saved}% so far`,
        );
      }
      return result;
    } catch (err) {
      failed.push({ src, error: String(err?.message || err) });
      done += 1;
      console.error(`FAIL ${src}:`, err?.message || err);
      return null;
    }
  });

  console.log("\nDone.");
  console.log(
    `OK: ${images.length - failed.length}, failed: ${failed.length}`,
  );
  console.log(
    `Size: ${(bytesIn / 1024 / 1024).toFixed(1)} MB → ${(bytesOut / 1024 / 1024).toFixed(1)} MB`,
  );
  if (failed.length) {
    console.log("Failures:");
    for (const f of failed) console.log(" -", f.src, f.error);
    process.exit(1);
  }
}

main();
