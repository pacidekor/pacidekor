/**
 * Spracuje 15 produktov z katalog_raw/nahrat na eshop → nahrat na eshop pojmenovane
 * node _katalog-work/process-nahrat-na-eshop.js
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..", "katalog_raw");
const SRC = path.join(ROOT, "nahrat na eshop");
const OUT = path.join(ROOT, "nahrat na eshop pojmenovane");
const CATALOG = path.join(__dirname, "nahrat-na-eshop-products.json");

const MAX_EDGE = 1800;
const WEBP_QUALITY = 82;

async function compressToWebp(src, dest) {
  const before = fs.statSync(src).size;
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
  const after = fs.statSync(dest).size;
  return { before, after };
}

function buildColorLines(product) {
  const ranges = [];
  let i = 0;
  let colorIdx = 0;
  while (i < product.photos.length) {
    const label = product.labels[i];
    const start = i + 1;
    if (label === "mix") {
      ranges.push(`mix (všetky farby) [${start}]`);
      break;
    }
    if (label === "pot/full") {
      const end = Math.min(i + 3, product.photos.length);
      const color = product.colors[colorIdx] || "?";
      ranges.push(`${color} [${start}–${end}]`);
      i += 3;
      colorIdx += 1;
      continue;
    }
    if (label === "detail") {
      const end = product.labels[i + 1] === "stem" ? i + 2 : i + 1;
      const color = product.colors[colorIdx] || "?";
      ranges.push(`${color} [${start}–${end}]`);
      i = end;
      colorIdx += 1;
      continue;
    }
    ranges.push(`extra [${start}]`);
    i += 1;
  }
  return ranges.join(" | ");
}

function buildInfoTxt(product, outNames, stats) {
  const colorLine = buildColorLines(product);
  const saved = stats.reduce((s, x) => s + (x.before - x.after), 0);
  const lines = [
    `Názov: ${product.name}`,
    `Zdrojová zložka: ${product.sourceFolder}`,
    `Typ: ${product.type}`,
    `Podkategória: ${product.subcategory}`,
    `Popis: ${product.desc}`,
    product.mixedNote ? `Poznámka: ${product.mixedNote}` : null,
    `Farby: ${colorLine}`,
    `Farby (ID pre e-shop): ${[...new Set(product.colorIds)].join(", ")}`,
    `Cena: 1,00 €`,
    `Obrázky: ${outNames.join(", ")}`,
    `Komprimácia: ${stats.length}× WebP (quality ${WEBP_QUALITY}, max ${MAX_EDGE}px)`,
    `Ušetrené: ${(saved / 1024).toFixed(0)} KB`,
    "",
  ].filter(Boolean);
  return lines.join("\n");
}

async function processProduct(product, index) {
  const srcDir = path.join(SRC, product.sourceFolder);
  if (!fs.existsSync(srcDir)) throw new Error("Chybí zdroj: " + product.sourceFolder);

  const folderName = `${String(index).padStart(2, "0")} ${product.name}`;
  const outDir = path.join(OUT, folderName);
  fs.mkdirSync(outDir, { recursive: true });

  const outNames = [];
  const stats = [];

  for (let i = 0; i < product.photos.length; i++) {
    const photo = product.photos[i];
    const src = path.join(srcDir, photo);
    if (!fs.existsSync(src)) {
      throw new Error(`Chybí fotka ${photo} v ${product.sourceFolder}`);
    }
    const outName = `${String(i + 1).padStart(2, "0")}.webp`;
    const dest = path.join(outDir, outName);
    const stat = await compressToWebp(src, dest);
    outNames.push(outName);
    stats.push(stat);
  }

  fs.writeFileSync(path.join(outDir, "info.txt"), buildInfoTxt(product, outNames, stats), "utf8");

  const meta = {
    slug: product.slug,
    name: product.name,
    description: product.desc,
    type: product.type,
    subcategory: product.subcategory,
    colors: product.colors,
    colorIds: product.colorIds,
    sourceFolder: product.sourceFolder,
    imageCount: outNames.length,
    images: outNames.map((name, i) => ({
      file: name,
      label: product.labels[i] || "extra",
      color:
        product.labels[i] === "mix"
          ? "mix"
          : product.colors[
              Math.floor(
                product.labels.slice(0, i + 1).filter((l) => l === "pot/full").length - 1,
              )
            ] || product.colors[0],
    })),
  };
  fs.writeFileSync(path.join(outDir, "meta.json"), JSON.stringify(meta, null, 2), "utf8");

  return { folderName, images: outNames.length, bytesSaved: stats.reduce((s, x) => s + (x.before - x.after), 0) };
}

async function main() {
  const products = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  console.log(`Spracúvam ${products.length} produktov…\n`);
  const manifest = [];

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    process.stdout.write(`[${i + 1}/${products.length}] ${p.name} … `);
    const result = await processProduct(p, i + 1);
    console.log(`OK (${result.images} webp, −${(result.bytesSaved / 1024).toFixed(0)} KB)`);
    manifest.push({ ...result, slug: p.slug, source: p.sourceFolder });
  }

  const readme = [
    "PACIDEKOR – Nahrát na e-shop (pojmenované)",
    `Vygenerováno: ${new Date().toISOString()}`,
    `Produktov: ${products.length}`,
    "",
    "Každá složka obsahuje:",
    "- 01.webp, 02.webp, … (zoradené: květináč → detail → stonok, mix vždy posledný)",
    "- info.txt (názov, popis, farby, cena)",
    "- meta.json (struktúra pre import na e-shop)",
    "",
    "Preskočené: PREFOTIT/ (samostatne)",
    "",
    ...manifest.map((m) => `- ${m.folderName} ← ${m.source} (${m.images} fotiek)`),
    "",
  ].join("\n");

  fs.writeFileSync(path.join(OUT, "README.txt"), readme, "utf8");
  fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  console.log("\nHotovo:", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
