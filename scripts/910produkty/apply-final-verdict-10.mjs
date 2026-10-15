/**
 * Apply final 10-product verdict: simple fixes + splits → ready folders + catalog.
 *
 * Usage:
 *   node scripts/910produkty/apply-final-verdict-10.mjs "c:/Users/tomas/Downloads/PACIDEKOR-910-finalny-verdikt-10-produktov.json"
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const ROOT = path.resolve(".");
const READY = path.join(ROOT, "public/910produkty-ready");
const CATALOG_PATH = path.join(ROOT, "scripts/910produkty/catalog.json");
const auditPath = process.argv[2];

if (!auditPath || !fs.existsSync(auditPath)) {
  console.error("Usage: node scripts/910produkty/apply-final-verdict-10.mjs <json>");
  process.exit(1);
}

const audit = JSON.parse(fs.readFileSync(auditPath, "utf8"));
fs.copyFileSync(
  auditPath,
  path.join(ROOT, "scripts/910produkty/validation-reports/final-verdict-10.json"),
);

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
let nextId = Math.max(...catalog.map((p) => p.id), 273) + 1;

function noEm(s) {
  return String(s || "").replace(/[\u2013\u2014\u2015]/g, "-");
}

function parseFarbyToGroups(farby, imageCount) {
  if (!farby) return [{ color: "prírodná", photos: Array.from({ length: imageCount }, (_, i) => i + 1) }];
  return farby
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^(.+?)\s*\[([^\]]+)\]\s*$/);
      if (!m) {
        return {
          color: part.toLowerCase(),
          photos: Array.from({ length: imageCount }, (_, i) => i + 1),
        };
      }
      const color = m[1].trim().toLowerCase();
      const photos = [];
      for (const token of m[2].split(",").map((s) => s.trim())) {
        if (/^\d+-\d+$/.test(token)) {
          const [a, b] = token.split("-").map(Number);
          for (let i = a; i <= b; i++) photos.push(i);
        } else if (/^\d+$/.test(token)) {
          photos.push(Number(token));
        }
      }
      return {
        color,
        photos: [...new Set(photos)]
          .filter((n) => n >= 1 && n <= imageCount)
          .sort((a, b) => a - b),
      };
    })
    .filter((g) => g.color && g.photos.length);
}

function setInfoField(raw, key, value) {
  if (value == null || value === "") return raw;
  const line = `${key}: ${noEm(value)}`;
  const re = new RegExp(`^${key}:.*$`, "m");
  if (re.test(raw)) return raw.replace(re, line);
  return raw.trimEnd() + "\n" + line + "\n";
}

function writeInfo({
  destDir,
  name,
  description,
  farby,
  category,
  subcategory,
  druh,
  sourceFolder,
  sourcePath,
  batch,
  note,
}) {
  const lines = [
    `Názov: ${noEm(name)}`,
    `Popis: ${noEm(description)}`,
    `Farby: ${noEm(farby)}`,
    `Druh: ${noEm(druh || "")}`,
    `Kategória: ${noEm(category)}`,
    `Subkategória: ${noEm(subcategory || "")}`,
    `Zdrojová zložka: ${noEm(sourceFolder || "")}`,
    `Zdrojová cesta: ${noEm(sourcePath || "")}`,
    batch ? `Dávka: ${noEm(batch)}` : null,
    note ? `Poznámka: ${noEm(note)}` : null,
  ].filter(Boolean);
  fs.writeFileSync(path.join(destDir, "info.txt"), lines.join("\n") + "\n", "utf8");
}

async function copyPhotos(srcDir, destDir, photoNums) {
  fs.mkdirSync(destDir, { recursive: true });

  // Stage in a temp dir so in-place rebuilds never unlink locked sources (Windows).
  const stage = fs.mkdtempSync(path.join(destDir, ".stage-"));
  try {
    for (let i = 0; i < photoNums.length; i++) {
      const src = path.join(srcDir, `${photoNums[i]}.webp`);
      if (!fs.existsSync(src)) throw new Error(`missing ${src}`);
      const raw = fs.readFileSync(src);
      const out = await sharp(raw)
        .rotate()
        .webp({ quality: 82, effort: 4 })
        .toBuffer();
      fs.writeFileSync(path.join(stage, `${i + 1}.webp`), out);
    }

    for (const f of fs.readdirSync(destDir)) {
      if (/^\d+\.webp$/i.test(f)) {
        try {
          fs.unlinkSync(path.join(destDir, f));
        } catch (e) {
          if (e.code !== "EBUSY" && e.code !== "EPERM") throw e;
          // Fall through: overwrite via rename below if possible.
        }
      }
    }

    for (let i = 1; i <= photoNums.length; i++) {
      const from = path.join(stage, `${i}.webp`);
      const to = path.join(destDir, `${i}.webp`);
      try {
        fs.renameSync(from, to);
      } catch {
        fs.copyFileSync(from, to);
      }
    }
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
  }
  return photoNums.length;
}

function upsertCatalog(entry) {
  const idx = catalog.findIndex((p) => p.id === entry.id);
  if (idx >= 0) catalog[idx] = { ...catalog[idx], ...entry };
  else catalog.push(entry);
}

const report = {
  fixed: [],
  splits: [],
  importIds: [],
};

// --- simple imports ---
for (const p of audit.products.filter((x) => x.finalVerdict === "import")) {
  const id = String(p.id).padStart(3, "0");
  const dir = path.join(READY, id);
  const srcInfo = fs.readFileSync(path.join(dir, "info.txt"), "utf8");
  const get = (k) => (srcInfo.match(new RegExp(`^${k}:\\s*(.*)$`, "m")) || [])[1] || "";

  const existing = fs
    .readdirSync(dir)
    .filter((f) => /^\d+\.webp$/i.test(f))
    .map((f) => Number(f.replace(/\D/g, "")))
    .sort((a, b) => a - b);

  const photoOrder =
    Array.isArray(p.photos) && p.photos.length ? p.photos : existing;

  // Skip in-place rewrite when gallery order is already final.
  const identity =
    photoOrder.length === existing.length &&
    photoOrder.every((n, i) => n === existing[i]) &&
    existing.every((n, i) => n === i + 1);

  const imgCount = identity
    ? existing.length
    : await copyPhotos(dir, dir, photoOrder);
  const farby = p.importFarby || p.proposedFarby;
  const name = p.proposedName || get("Názov");
  const description = p.proposedDescription || get("Popis");
  const category = p.proposedCategory || get("Kategória");
  const subcategory = p.proposedSubcategory || get("Subkategória");

  writeInfo({
    destDir: dir,
    name,
    description,
    farby,
    category,
    subcategory,
    druh: get("Druh"),
    sourceFolder: get("Zdrojová zložka"),
    sourcePath: get("Zdrojová cesta"),
    batch: get("Dávka"),
    note: `final-verdict:${p.finalVerdict}`,
  });

  upsertCatalog({
    id: Number(id),
    sourceKey: `final::${id}`,
    sourceFolder: get("Zdrojová zložka") || id,
    sourcePath: get("Zdrojová cesta") || dir,
    batch: get("Dávka") || "",
    group: null,
    imageCount: imgCount,
    videos: [],
    name,
    description,
    category,
    subcategory: subcategory || "",
    druh: get("Druh") || "",
    groups: parseFarbyToGroups(farby, imgCount),
    confidence: p.confidence,
    notes: p.notes || "",
  });

  report.fixed.push({ id, farby, photos: photoOrder, imgCount });
  report.importIds.push(Number(id));
  console.log("FIXED", id, farby, "imgs", imgCount);
}

// --- splits ---
for (const p of audit.products.filter((x) => x.finalVerdict === "split")) {
  const srcId = String(p.id).padStart(3, "0");
  const srcDir = path.join(READY, srcId);
  const srcInfo = fs.readFileSync(path.join(srcDir, "info.txt"), "utf8");
  const get = (k) => (srcInfo.match(new RegExp(`^${k}:\\s*(.*)$`, "m")) || [])[1] || "";

  for (const sp of p.splitPlan || []) {
    const newNum = nextId++;
    const newPad = String(newNum).padStart(3, "0");
    const destDir = path.join(READY, newPad);
    fs.mkdirSync(destDir, { recursive: true });

    const imgCount = await copyPhotos(srcDir, destDir, sp.photos);
    const farby = sp.importFarby || sp.farby;
    const name = sp.name;
    const description = sp.description || get("Popis");
    const category = sp.category || get("Kategória");
    const subcategory = sp.subcategory || "";

    writeInfo({
      destDir,
      name,
      description,
      farby,
      category,
      subcategory,
      druh: get("Druh"),
      sourceFolder: `${get("Zdrojová zložka")} → ${sp.newId}`,
      sourcePath: get("Zdrojová cesta"),
      batch: get("Dávka"),
      note: `split from ${srcId} as ${sp.newId}`,
    });

    upsertCatalog({
      id: newNum,
      sourceKey: `split::${srcId}::${sp.newId}`,
      sourceFolder: sp.newId,
      sourcePath: get("Zdrojová cesta") || srcDir,
      batch: get("Dávka") || "",
      group: null,
      imageCount: imgCount,
      videos: [],
      name,
      description,
      category,
      subcategory,
      druh: get("Druh") || "",
      groups: parseFarbyToGroups(farby, imgCount),
      confidence: p.confidence,
      notes: sp.notes || p.notes || "",
      splitFrom: srcId,
      splitTempId: sp.newId,
    });

    report.splits.push({
      from: srcId,
      tempId: sp.newId,
      readyId: newPad,
      name,
      farby,
      photos: sp.photos,
    });
    report.importIds.push(newNum);
    console.log("SPLIT", srcId, "→", newPad, `(${sp.newId})`, name);
  }
}

fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2), "utf8");
report.importIds = [...new Set(report.importIds)].sort((a, b) => a - b);

fs.writeFileSync(
  path.join(ROOT, "scripts/910produkty/validation-reports/final-verdict-apply.json"),
  JSON.stringify(report, null, 2),
  "utf8",
);

console.log("\nimport --only", report.importIds.join(","));
console.log("fixed", report.fixed.length, "split products", report.splits.length);
