/**
 * Export inventory (+ optional catalog.json) → public/1010produkty-ready/{001,...}
 *
 * Usage:
 *   node scripts/1010produkty/export-ready.mjs
 *   node scripts/1010produkty/export-ready.mjs --force
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const ROOT = path.resolve(".");
const SCRIPT = path.join(ROOT, "scripts/1010produkty");
const INV = JSON.parse(fs.readFileSync(path.join(SCRIPT, "inventory.json"), "utf8"));
const CATALOG_PATH = path.join(SCRIPT, "catalog.json");
const OUT = path.join(ROOT, "public/1010produkty-ready");

const args = {
  force: process.argv.includes("--force"),
  limit: null,
};
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === "--limit") args.limit = Number(process.argv[++i]);
}

function noEm(s) {
  return String(s || "")
    .replace(/[\u2013\u2014\u2015]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function photoSortKey(name) {
  const of = name.match(/\((\d+)\s+of\s+\d+\)/i);
  if (of) return Number(of[1]);
  const n = name.match(/\((\d+)\)/);
  if (n) return Number(n[1]);
  const lead = name.match(/^(\d+)/);
  if (lead) return Number(lead[1]);
  return 0;
}

function stubCatalog() {
  return INV.filter((p) => p.images.length).map((p, i) => {
    const id = i + 1;
    const n = p.images.length;
    return {
      id,
      sourceKey: `${p.batch}::${p.group || ""}::${p.folder}`,
      sourceFolder: p.folder,
      sourcePath: p.path,
      batch: p.batch,
      group: p.group,
      imageCount: n,
      videos: p.videos || [],
      name: `Produkt ${p.folder} (prefotené)`,
      description: "Doplniť popis po kontrole fotografií.",
      category: "Umelé kvety",
      subcategory: "",
      druh: "",
      groups: [{ color: "prírodná", photos: Array.from({ length: n }, (_, j) => j + 1) }],
      confidence: 0,
      notes: "draft — čaká na katalogizáciu",
    };
  });
}

let catalog = fs.existsSync(CATALOG_PATH)
  ? JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"))
  : stubCatalog();

if (!fs.existsSync(CATALOG_PATH)) {
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2), "utf8");
  console.log("wrote stub catalog.json");
}

const invByKey = Object.fromEntries(
  INV.filter((p) => p.images.length).map((p) => [
    `${p.batch}::${p.group || ""}::${p.folder}`,
    p,
  ]),
);

fs.mkdirSync(OUT, { recursive: true });
let items = [...catalog].sort((a, b) => a.id - b.id);
if (args.limit) items = items.slice(0, args.limit);

const mapLog = [];

for (const p of items) {
  const inv =
    invByKey[p.sourceKey] ||
    INV.find((x) => x.path === p.sourcePath || x.folder === p.sourceFolder);
  if (!inv) {
    console.error("missing inventory for", p.id, p.sourceKey);
    continue;
  }

  const outId = String(p.id).padStart(3, "0");
  const dest = path.join(OUT, outId);

  if (fs.existsSync(dest) && !args.force) {
    const existing = fs.readdirSync(dest).filter((f) => /^\d+\.webp$/i.test(f));
    if (existing.length === inv.images.length) {
      console.log("skip existing", outId);
      mapLog.push({ out: outId, source: p.sourcePath, name: p.name, images: existing.length, skipped: true });
      continue;
    }
  }

  fs.mkdirSync(dest, { recursive: true });
  for (const f of fs.existsSync(dest) ? fs.readdirSync(dest) : []) {
    if (/^\d+\.webp$/i.test(f)) fs.unlinkSync(path.join(dest, f));
  }

  // Keep source photo order so Farby indices stay stable (shared mix shots OK).
  const imagesSorted = [...inv.images].sort(
    (a, b) => photoSortKey(a) - photoSortKey(b),
  );

  const colorLines = [];
  for (const g of p.groups || []) {
    const mapped = [...new Set((g.photos || []).map(Number))]
      .filter((n) => n >= 1 && n <= imagesSorted.length)
      .sort((a, b) => a - b);
    if (!mapped.length || !g.color) continue;
    const start = mapped[0];
    const end = mapped[mapped.length - 1];
    const contiguous = mapped.every((n, i) => n === start + i);
    colorLines.push(
      contiguous
        ? start === end
          ? `${noEm(g.color)} [${start}]`
          : `${noEm(g.color)} [${start}-${end}]`
        : `${noEm(g.color)} [${mapped.join(",")}]`,
    );
  }
  if (!colorLines.length) colorLines.push(`prírodná [1-${imagesSorted.length}]`);

  let imgN = 1;
  for (const file of imagesSorted) {
    const src = path.join(inv.path, file);
    await sharp(src)
      .rotate()
      .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 4, smartSubsample: true })
      .toFile(path.join(dest, `${imgN}.webp`));
    imgN += 1;
  }

  const info = [
    `Názov: ${noEm(p.name)}`,
    `Popis: ${noEm(p.description)}`,
    `Farby: ${colorLines.join(" | ")}`,
    `Druh: ${noEm(p.druh)}`,
    `Kategória: ${noEm(p.category)}`,
    `Subkategória: ${noEm(p.subcategory)}`,
    `Zdrojová zložka: ${p.sourceFolder}`,
    `Zdrojová cesta: ${p.sourcePath}`,
    `Dávka: ${p.batch}${p.group ? ` / ${p.group}` : ""}`,
  ].join("\n");

  fs.writeFileSync(path.join(dest, "info.txt"), info + "\n", "utf8");
  mapLog.push({ out: outId, source: p.sourcePath, name: p.name, images: imgN - 1 });
  console.log("exported", outId, p.name, `(${imgN - 1} img)`);
}

fs.writeFileSync(path.join(SCRIPT, "export-map.json"), JSON.stringify(mapLog, null, 2), "utf8");
fs.writeFileSync(path.join(OUT, "catalog.json"), JSON.stringify(catalog, null, 2), "utf8");
console.log("done", mapLog.length, "→", OUT);
