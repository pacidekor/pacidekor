/**
 * Přepočítá všechny složky s přesným multi-hash matchem.
 * node _katalog-work/rematch-all.js
 */
const fs = require("fs");
const path = require("path");
const {
  THRESH,
  safe,
  stripStatus,
  walkImages,
  loadEnv,
  fetchProducts,
  buildProductIndex,
  buildDbIndex,
  hashLocalImages,
  scoreFolder,
} = require("./match-engine");

const ROOT = path.join(__dirname, "..");
const KATALOG = path.join(ROOT, "katalog_raw");
const DB = path.join(KATALOG, "databaze_co_uz_mame");
const CACHE = path.join(__dirname, "hash-cache-v2.json");
const REPORT = path.join(__dirname, "rematch-report.tsv");
const REPORT_JSON = path.join(__dirname, "rematch-report.json");

const SECTIONS = [
  {
    id: "normal",
    dir: path.join(KATALOG, "produktyznovu"),
    skip: new Set(["prefotit", "ii"]),
  },
  { id: "prefotit", dir: path.join(KATALOG, "produktyznovu", "prefotit") },
  { id: "ii", dir: path.join(KATALOG, "produktyznovu", "ii") },
  { id: "list", dir: path.join(KATALOG, "list") },
  { id: "nove", dir: path.join(KATALOG, "nove-neni-na-eshopu") },
];

function listProductDirs(section) {
  if (!fs.existsSync(section.dir)) return [];
  return fs
    .readdirSync(section.dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => !section.skip || !section.skip.has(name))
    .sort((a, b) => a.localeCompare(b, "sk", { numeric: true }));
}

function parseOrigName(sectionId, folderName) {
  const cleaned = stripStatus(folderName);
  const m = cleaned.match(/^\d{3}\s+(.+)$/);
  if (m) return m[1];
  if (sectionId === "ii") return cleaned.replace(/^\d{3}\s+/, "");
  return cleaned;
}

function writeMatchTxt(destDir, sectionId, origName, result, productsById) {
  const p = result.bestProduct
    ? productsById.get(result.bestProduct.productId)
    : null;
  const lines = [
    `section: ${sectionId}`,
    `status: ${result.status}`,
    `confidence: ${result.confidence}`,
    `reason: ${result.reason}`,
    `orig: ${origName}`,
    `local_images: ${result.localCount}`,
    `matched_local_images: ${result.matchedLocalCount}`,
    "",
    "thresholds:",
    `  dhash64 strong<=${THRESH.dhash64.strong} ok<=${THRESH.dhash64.ok} weak<=${THRESH.dhash64.weak}`,
    `  ahash64 strong<=${THRESH.ahash64.strong} ok<=${THRESH.ahash64.ok} weak<=${THRESH.ahash64.weak}`,
    `  dhash256 strong<=${THRESH.dhash256.strong} ok<=${THRESH.dhash256.ok} weak<=${THRESH.dhash256.weak}`,
    "",
  ];

  if (p) {
    lines.push(
      `product_id: ${p.id}`,
      `product_name: ${p.name}`,
      `product_sku: ${p.sku || ""}`,
      `product_slug: ${p.slug || ""}`,
      "",
    );
  }

  if (result.bestProduct) {
    lines.push(
      "best_product_match:",
      `  strong_hits: ${result.bestProduct.strong}`,
      `  ok_hits: ${result.bestProduct.ok}`,
      `  weak_hits: ${result.bestProduct.weak}`,
      `  avg_dhash64: ${result.bestProduct.avgDhash.toFixed(2)}`,
      `  coverage: ${(result.bestProduct.coverage * 100).toFixed(1)}%`,
      "",
    );
  }

  if (result.bestSingle?.db) {
    lines.push(
      "best_single_image:",
      `  quality: ${result.bestSingle.quality}`,
      `  dhash64: ${result.bestSingle.dist.dhash64}`,
      `  ahash64: ${result.bestSingle.dist.ahash64}`,
      `  dhash256: ${result.bestSingle.dist.dhash256}`,
      `  local: ${path.basename(result.bestSingle.db.file)}`,
      `  db: ${result.bestSingle.db.rel}`,
      "",
    );
  }

  if (result.ranked.length) {
    lines.push("top_products:");
    for (const r of result.ranked) {
      const prod = productsById.get(r.productId);
      lines.push(
        `  - ${r.productId} | ${prod?.name || "?"} | score=${r.score.toFixed(1)} | strong=${r.strong} ok=${r.ok} weak=${r.weak} avg_d=${r.avgDhash.toFixed(1)}`,
      );
    }
    lines.push("");
  }

  fs.writeFileSync(path.join(destDir, "MATCH.txt"), lines.join("\n"), "utf8");
}

async function processSection(section, dbIndex, imageToProduct, productsById) {
  const names = listProductDirs(section);
  const rows = [];
  console.log(`\n=== ${section.id.toUpperCase()} (${names.length}) ===`);

  for (const name of names) {
    const dirPath = path.join(section.dir, name);
    const origName = parseOrigName(section.id, name);
    const images = walkImages(dirPath).filter(
      (f) => !path.basename(f).startsWith("."),
    );
    const localHashes = await hashLocalImages(images, CACHE, section.id);
    const result = scoreFolder(localHashes, dbIndex, imageToProduct);

    const cleaned = stripStatus(name);
    const newName = `${cleaned} ${result.status}`;
    const newPath = path.join(section.dir, newName);
    if (dirPath !== newPath) {
      if (fs.existsSync(newPath)) fs.rmSync(newPath, { recursive: true, force: true });
      fs.renameSync(dirPath, newPath);
    }

    writeMatchTxt(newPath, section.id, origName, result, productsById);

    const p = result.bestProduct
      ? productsById.get(result.bestProduct.productId)
      : null;
    rows.push({
      section: section.id,
      folder: newName,
      orig: origName,
      status: result.status,
      confidence: result.confidence,
      local_images: result.localCount,
      matched_local_images: result.matchedLocalCount,
      product_id: p?.id || "",
      product_name: p?.name || "",
      product_sku: p?.sku || "",
      strong_hits: result.bestProduct?.strong || 0,
      ok_hits: result.bestProduct?.ok || 0,
      weak_hits: result.bestProduct?.weak || 0,
      avg_dhash64: result.bestProduct
        ? Number(result.bestProduct.avgDhash.toFixed(2))
        : "",
      reason: result.reason,
    });

    console.log(
      result.status.padEnd(14),
      result.confidence.padEnd(8),
      `imgs=${String(result.localCount).padStart(3)}`,
      `hits=${String(result.matchedLocalCount).padStart(3)}`,
      p ? p.name.slice(0, 40) : "-",
      " | ",
      newName,
    );
  }

  return rows;
}

async function main() {
  loadEnv(ROOT);
  if (!fs.existsSync(DB)) throw new Error("Chybí " + DB);

  console.log("Načítám produkty ze Supabase…");
  const products = await fetchProducts();
  const { imageToProduct, productsById } = buildProductIndex(products);
  console.log("Produktů:", products.length, "| mapovaných obrázků:", imageToProduct.size);

  console.log("Hashuji DB export (s cache)…");
  const dbIndex = await buildDbIndex(DB, CACHE);
  console.log("DB index:", dbIndex.length);

  const allRows = [];
  for (const section of SECTIONS) {
    const rows = await processSection(section, dbIndex, imageToProduct, productsById);
    allRows.push(...rows);
  }

  const counts = { NA_ESHOPU: 0, NEJISTE: 0, NENI_NA_ESHOPU: 0 };
  for (const r of allRows) counts[r.status] += 1;

  const bySection = {};
  for (const r of allRows) {
    bySection[r.section] = bySection[r.section] || {
      NA_ESHOPU: 0,
      NEJISTE: 0,
      NENI_NA_ESHOPU: 0,
      total: 0,
    };
    bySection[r.section][r.status] += 1;
    bySection[r.section].total += 1;
  }

  const tsv = [
    [
      "section",
      "folder",
      "orig",
      "status",
      "confidence",
      "local_images",
      "matched_local_images",
      "product_id",
      "product_name",
      "product_sku",
      "strong_hits",
      "ok_hits",
      "weak_hits",
      "avg_dhash64",
      "reason",
    ].join("\t"),
    ...allRows.map((r) =>
      [
        r.section,
        r.folder,
        r.orig,
        r.status,
        r.confidence,
        r.local_images,
        r.matched_local_images,
        r.product_id,
        r.product_name,
        r.product_sku,
        r.strong_hits,
        r.ok_hits,
        r.weak_hits,
        r.avg_dhash64,
        r.reason,
      ].join("\t"),
    ),
  ].join("\n");

  fs.writeFileSync(REPORT, tsv + "\n", "utf8");
  fs.writeFileSync(
    REPORT_JSON,
    JSON.stringify({ generatedAt: new Date().toISOString(), counts, bySection, rows: allRows }, null, 2),
    "utf8",
  );

  fs.writeFileSync(path.join(KATALOG, "REMATCH-PREHLED.txt"), [
    "PACIDEKOR – přesný rematch (multi-hash + product-level)",
    `Vygenerováno: ${new Date().toISOString()}`,
    "",
    "Algoritmus:",
    "- dHash 64 + dHash 256 + aHash 64",
    "- porovnání VŠECH fotek ve složce",
    "- agregace shod na úroveň produktu ze Supabase",
    "- 3 stavy: NA_ESHOPU / NEJISTE / NENI_NA_ESHOPU",
    "",
    "Celkem:",
    `  NA_ESHOPU:       ${counts.NA_ESHOPU}`,
    `  NEJISTE:         ${counts["NEJISTE"]}`,
    `  NENI_NA_ESHOPU:  ${counts.NENI_NA_ESHOPU}`,
    "",
    ...Object.entries(bySection).map(
      ([sec, c]) =>
        `${sec}: ${c.total} (NA=${c.NA_ESHOPU}, NEJISTE=${c["NEJISTE"]}, NENI=${c.NENI_NA_ESHOPU})`,
    ),
    "",
    "Detail: _katalog-work/rematch-report.tsv",
  ].join("\n"), "utf8");

  console.log("\n=== CELKEM ===");
  console.log(counts);
  console.log(bySection);
  console.log("Report:", REPORT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
