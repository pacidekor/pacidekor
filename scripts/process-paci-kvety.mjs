/**
 * Process Paci Kvety product folders into numbered web-ready packs.
 *
 * Usage:
 *   node scripts/process-paci-kvety.mjs --batch 1
 *   node scripts/process-paci-kvety.mjs --batch 2
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve("public/products/Paci Kvety");
const OUT_ROOT = path.resolve("public/products/paci-kvety-ready");
const BATCHES = JSON.parse(
  fs.readFileSync(path.resolve("scripts/paci-kvety-batches.json"), "utf8"),
);

const args = process.argv.slice(2);
const batchArg = args.find((a) => a.startsWith("--batch"));
const batchNum = batchArg
  ? Number(batchArg.includes("=") ? batchArg.split("=")[1] : args[args.indexOf(batchArg) + 1])
  : 1;

const folderNames = batchNum === 2 ? BATCHES.batch2 : BATCHES.batch1;
const startIndex = batchNum === 2 ? BATCHES.batch1.length + 1 : 1;

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"]);

function listImages(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && IMAGE_EXT.has(path.extname(d.name).toLowerCase()))
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b, "sk", { numeric: true }));
}

async function processFolder(sourceName, outIndex) {
  const srcDir = path.join(ROOT, sourceName);
  const outId = String(outIndex).padStart(3, "0");
  const outDir = path.join(OUT_ROOT, outId);
  fs.mkdirSync(outDir, { recursive: true });

  const images = listImages(srcDir);
  if (images.length === 0) {
    console.warn(`SKIP empty: ${sourceName}`);
    return null;
  }

  const written = [];
  for (let i = 0; i < images.length; i += 1) {
    const src = path.join(srcDir, images[i]);
    const destName = `${i + 1}.webp`;
    const dest = path.join(outDir, destName);
    await sharp(src)
      .rotate()
      .resize({
        width: 1800,
        height: 1800,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toFile(dest);
    written.push(destName);
  }

  const infoPath = path.join(outDir, "info.txt");
  if (!fs.existsSync(infoPath)) {
    const stub = [
      `Názov: (doplní sa)`,
      `Zdrojová zložka: ${sourceName}`,
      `Popis: (doplní sa)`,
      `Farby: (doplní sa – ak má produkt viac farieb, uveď varianty; čísla v [] = čísla fotiek)`,
      `Cena: 1,00 €`,
      `Obrázky: ${written.join(", ")}`,
      "",
    ].join("\n");
    fs.writeFileSync(infoPath, stub, "utf8");
  }

  return { outId, sourceName, images: written.length };
}

async function main() {
  fs.mkdirSync(OUT_ROOT, { recursive: true });
  console.log(`Batch ${batchNum}: ${folderNames.length} folders → index from ${startIndex}`);

  const manifest = [];
  for (let i = 0; i < folderNames.length; i += 1) {
    const sourceName = folderNames[i];
    const outIndex = startIndex + i;
    process.stdout.write(`[${i + 1}/${folderNames.length}] ${sourceName} … `);
    try {
      const result = await processFolder(sourceName, outIndex);
      if (result) {
        console.log(`→ ${result.outId} (${result.images} imgs)`);
        manifest.push(result);
      }
    } catch (err) {
      console.log("ERROR");
      console.error(err);
    }
  }

  const manifestPath = path.join(OUT_ROOT, `manifest-batch${batchNum}.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`Done. Manifest: ${manifestPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
