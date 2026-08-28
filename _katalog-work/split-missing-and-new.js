const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "katalog_raw");
const DB_EXPORT = path.join(ROOT, "databaze_co_uz_mame");
const PREFOTIT_SRC = path.join(ROOT, "produktyznovu", "prefotit");
const NEW_DIR = path.join(ROOT, "nove-neni-na-eshopu");
const MISSING_DIR = path.join(ROOT, "na-eshopu-chybi-v-dumpu");

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

function safe(name) {
  return name.replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, " ").trim();
}

function walkFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(p, acc);
    else if (/\.(jpe?g|png|webp|gif)$/i.test(entry.name)) acc.push(p);
  }
  return acc;
}

function imageUuidFromUrl(url) {
  const m = url.match(
    /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi,
  );
  return m ? m[m.length - 1].toLowerCase() : null;
}

function buildExportIndex() {
  const index = new Map();
  for (const file of walkFiles(DB_EXPORT)) {
    const base = path.basename(file);
    const m = base.match(
      /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
    );
    if (m) index.set(m[1].toLowerCase(), file);
  }
  return index;
}

function walkAll(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walkAll(p, acc);
    else acc.push(p);
  }
  return acc;
}

function extractMatchedUuids() {
  const uuids = new Set();
  const produktyznovu = path.join(ROOT, "produktyznovu");
  for (const matchFile of walkAll(produktyznovu).filter((f) =>
    f.endsWith("MATCH.txt"),
  )) {
    const content = fs.readFileSync(matchFile, "utf8");
    const line = content
      .split("\n")
      .find((l) => l.startsWith("db:") || l.startsWith("db_image:"));
    if (!line) continue;
    const uuid = imageUuidFromUrl(line);
    if (uuid) uuids.add(uuid);
  }
  return uuids;
}

async function fetchProducts() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(
    `${url}/rest/v1/products?select=id,name,sku,slug,images&order=name`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

function productMatched(product, matchedUuids) {
  for (const img of product.images || []) {
    const uuid = imageUuidFromUrl(img);
    if (uuid && matchedUuids.has(uuid)) return true;
  }
  return false;
}

function copyProductImages(product, destDir, exportIndex) {
  let copied = 0;
  const missing = [];
  (product.images || []).forEach((img, i) => {
    const uuid = imageUuidFromUrl(img);
    if (!uuid) return;
    const src = exportIndex.get(uuid);
    if (!src) {
      missing.push(uuid);
      return;
    }
    const ext = path.extname(src);
    fs.copyFileSync(src, path.join(destDir, `${String(i + 1).padStart(2, "0")}${ext}`));
    copied += 1;
  });
  return { copied, missing };
}

function moveNewFolders() {
  fs.mkdirSync(NEW_DIR, { recursive: true });
  const moved = [];
  for (const entry of fs.readdirSync(PREFOTIT_SRC, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.includes("NENI_NA_ESHOPU")) continue;
    const src = path.join(PREFOTIT_SRC, entry.name);
    const dest = path.join(NEW_DIR, entry.name);
    if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
    fs.renameSync(src, dest);
    moved.push(entry.name);
  }
  moved.sort((a, b) => a.localeCompare(b, "sk", { numeric: true }));
  return moved;
}

async function main() {
  loadEnv();
  const matchedUuids = extractMatchedUuids();
  const exportIndex = buildExportIndex();
  const products = await fetchProducts();

  const missingProducts = products.filter((p) => !productMatched(p, matchedUuids));
  missingProducts.sort((a, b) => a.name.localeCompare(b.name, "sk"));

  if (fs.existsSync(MISSING_DIR)) fs.rmSync(MISSING_DIR, { recursive: true, force: true });
  fs.mkdirSync(MISSING_DIR, { recursive: true });

  const missingRows = [];
  missingProducts.forEach((product, i) => {
    const num = String(i + 1).padStart(2, "0");
    const skuPart = product.sku ? ` ${product.sku}` : "";
    const folderName = safe(`${num} ${product.name}${skuPart}`);
    const destDir = path.join(MISSING_DIR, folderName);
    fs.mkdirSync(destDir, { recursive: true });

    const { copied, missing } = copyProductImages(product, destDir, exportIndex);
    const info = [
      "status: NA_ESHOPU_CHYBI_V_DUMPU",
      `id: ${product.id}`,
      `name: ${product.name}`,
      `sku: ${product.sku || ""}`,
      `slug: ${product.slug || ""}`,
      `images_on_eshop: ${(product.images || []).length}`,
      `images_copied: ${copied}`,
      `images_missing_in_export: ${missing.length}`,
      "",
      "Poznámka: Produkt je na e-shope, ale v raw dumpu z Drive jsme k němu nenašli fotky.",
      "Obrázky zkopírovány z databaze_co_uz_mame (export ze Supabase).",
      "",
      "URL obrázků:",
      ...(product.images || []),
    ].join("\n");
    fs.writeFileSync(path.join(destDir, "info.txt"), info, "utf8");

    missingRows.push({
      num,
      name: product.name,
      sku: product.sku || "",
      slug: product.slug || "",
      copied,
      missingInExport: missing.length,
      folder: folderName,
    });
  });

  const movedNew = moveNewFolders();

  const readme = [
    "PACIDEKOR – přehled chybějících / nových produktů",
    `Vygenerováno: ${new Date().toISOString()}`,
    "",
    "=== nove-neni-na-eshopu/ (11 složek) ===",
    "Raw fotky z Drive, které NEJSOU na e-shopu. Připraveno k nahrání.",
    "",
    ...movedNew.map((n) => `- ${n}`),
    "",
    "=== na-eshopu-chybi-v-dumpu/ (25 produktů) ===",
    "Produkty, které JSOU na e-shopu, ale v raw dumpu z Drive chybí.",
    "Fotky zkopírované z databaze_co_uz_mame.",
    "",
    ...missingRows.map(
      (r) =>
        `- ${r.num} ${r.name}${r.sku ? ` [${r.sku}]` : ""} (${r.copied} fotek)`,
    ),
    "",
    `E-shop celkem: ${products.length}`,
    `Matchnuto raw dumpem: ${products.length - missingProducts.length}`,
    `Chybí v dumpu: ${missingProducts.length}`,
    `Nové k nahrání: ${movedNew.length}`,
  ].join("\n");

  fs.writeFileSync(path.join(ROOT, "PREHLED-CHYBEJICI-A-NOVE.txt"), readme, "utf8");

  const tsv = [
    "typ\tfolder\tname\tsku\tslug\timages",
    ...movedNew.map((f) => `NOVE_NENI_NA_ESHOPU\t${f}\t\t\t\t`),
    ...missingRows.map(
      (r) =>
        `NA_ESHOPU_CHYBI_V_DUMPU\t${r.folder}\t${r.name}\t${r.sku}\t${r.slug}\t${r.copied}`,
    ),
  ].join("\n");
  fs.writeFileSync(path.join(ROOT, "PREHLED-CHYBEJICI-A-NOVE.tsv"), tsv, "utf8");

  console.log(JSON.stringify({
    eshopTotal: products.length,
    missingFromDump: missingProducts.length,
    movedNewNotOnEshop: movedNew.length,
    newDir: NEW_DIR,
    missingDir: MISSING_DIR,
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
