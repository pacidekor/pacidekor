/**
 * Export catalog.json → public/910produkty-ready/{001,002,...}
 * with WebP + info.txt (+ copy videos as video-1.mp4 …)
 *
 * Usage:
 *   node scripts/910produkty/export-ready.mjs
 *   node scripts/910produkty/export-ready.mjs --limit 5
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const ROOT = path.resolve(".");
const CATALOG = JSON.parse(
  fs.readFileSync(path.join(ROOT, "scripts/910produkty/catalog.json"), "utf8"),
);
const INV = JSON.parse(
  fs.readFileSync(path.join(ROOT, "scripts/910produkty/inventory.json"), "utf8"),
);
const OUT = path.join(ROOT, "public/910produkty-ready");

function parseArgs(argv) {
  const args = { limit: null, force: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--limit") args.limit = Number(argv[++i]);
    else if (argv[i] === "--force") args.force = true;
  }
  return args;
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

function productKey(p) {
  return `${p.batch}::${p.group || ""}::${p.folder}`;
}

const invByKey = Object.fromEntries(
  INV.filter((p) => p.images.length).map((p) => [productKey(p), p]),
);

const args = parseArgs(process.argv);
fs.mkdirSync(OUT, { recursive: true });

let items = [...CATALOG].sort((a, b) => a.id - b.id);
if (args.limit) items = items.slice(0, args.limit);

const mapLog = [];
const videoAudit = [];

for (const p of items) {
  const inv = invByKey[p.sourceKey] || INV.find((x) => x.path === p.sourcePath);
  if (!inv) {
    console.error("missing inventory for", p.id, p.sourceKey);
    continue;
  }

  const outId = String(p.id).padStart(3, "0");
  const dest = path.join(OUT, outId);
  if (fs.existsSync(dest) && !args.force) {
    // still rebuild info if missing images count ok
    const existing = fs.readdirSync(dest).filter((f) => /^\d+\.webp$/i.test(f));
    if (existing.length === inv.images.length) {
      console.log("skip existing", outId);
      mapLog.push({
        out: outId,
        source: p.sourcePath,
        name: p.name,
        images: existing.length,
        skipped: true,
      });
      if (inv.videos?.length) {
        videoAudit.push({
          readyFolder: outId,
          sourcePath: p.sourcePath,
          name: p.name,
          videos: inv.videos,
        });
      }
      continue;
    }
  }

  fs.mkdirSync(dest, { recursive: true });

  // Build ordered photo list from groups (unique, preserve group order)
  const imagesSorted = [...inv.images].sort(
    (a, b) => photoSortKey(a) - photoSortKey(b),
  );
  const used = new Set();
  const orderedIndices = []; // 0-based into imagesSorted
  for (const g of p.groups || []) {
    for (const ph of g.photos || []) {
      const idx = Number(ph) - 1;
      if (idx < 0 || idx >= imagesSorted.length) continue;
      if (used.has(idx)) continue;
      used.add(idx);
      orderedIndices.push(idx);
    }
  }
  for (let i = 0; i < imagesSorted.length; i++) {
    if (!used.has(i)) orderedIndices.push(i);
  }

  // Remap color photo ranges to new 1-based order
  const oldToNew = new Map();
  orderedIndices.forEach((oldIdx, newPos) => {
    oldToNew.set(oldIdx + 1, newPos + 1);
  });

  const colorLines = [];
  for (const g of p.groups || []) {
    const mapped = (g.photos || [])
      .map((ph) => oldToNew.get(Number(ph)))
      .filter(Boolean)
      .sort((a, b) => a - b);
    if (!mapped.length || !g.color) continue;
    const start = mapped[0];
    const end = mapped[mapped.length - 1];
    const contiguous = mapped.every((n, i) => n === start + i);
    if (contiguous) {
      colorLines.push(
        start === end
          ? `${noEm(g.color)} [${start}]`
          : `${noEm(g.color)} [${start}-${end}]`,
      );
    } else {
      colorLines.push(`${noEm(g.color)} [${mapped.join(",")}]`);
    }
  }
  if (!colorLines.length) colorLines.push("prírodná [1]");

  let imgN = 1;
  for (const oldIdx of orderedIndices) {
    const src = path.join(inv.path, imagesSorted[oldIdx]);
    const outFile = path.join(dest, `${imgN}.webp`);
    await sharp(src)
      .rotate()
      .resize({
        width: 1800,
        height: 1800,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82, effort: 4, smartSubsample: true })
      .toFile(outFile);
    imgN += 1;
  }

  // copy videos
  const videoNames = [];
  for (let vi = 0; vi < (inv.videos || []).length; vi++) {
    const vname = inv.videos[vi];
    const ext = path.extname(vname).toLowerCase() || ".mp4";
    const destName = `video-${vi + 1}${ext}`;
    fs.copyFileSync(path.join(inv.path, vname), path.join(dest, destName));
    videoNames.push(destName);
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
    videoNames.length ? `Video: ${videoNames.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  fs.writeFileSync(path.join(dest, "info.txt"), info + "\n", "utf8");

  mapLog.push({
    out: outId,
    source: p.sourcePath,
    name: p.name,
    images: imgN - 1,
    videos: videoNames,
  });

  if (videoNames.length) {
    videoAudit.push({
      readyFolder: outId,
      sourcePath: p.sourcePath,
      name: p.name,
      videos: inv.videos,
      readyVideos: videoNames,
    });
  }

  console.log("exported", outId, p.name, `(${imgN - 1} img)`);
}

fs.writeFileSync(
  path.join(ROOT, "scripts/910produkty/export-map.json"),
  JSON.stringify(mapLog, null, 2),
  "utf8",
);

const auditLines = [
  "# Audit videí — várka 910produkty",
  "",
  `Celkem produktů v ready: ${mapLog.length}`,
  `Produktů s videem: ${videoAudit.length}`,
  "",
];
if (!videoAudit.length) {
  auditLines.push("Žádné video soubory.");
} else {
  for (const v of videoAudit) {
    auditLines.push(`## ${v.readyFolder} — ${v.name}`);
    auditLines.push(`- Zdroj: \`${v.sourcePath}\``);
    auditLines.push(`- Zdrojová videa: ${v.videos.join(", ")}`);
    if (v.readyVideos) auditLines.push(`- Ready: ${v.readyVideos.join(", ")}`);
    auditLines.push("");
  }
}

fs.writeFileSync(
  path.join(OUT, "AUDIT-VIDEO.md"),
  auditLines.join("\n"),
  "utf8",
);
fs.writeFileSync(
  path.join(ROOT, "scripts/910produkty/AUDIT-VIDEO.md"),
  auditLines.join("\n"),
  "utf8",
);

// also dump catalog copy into ready
fs.writeFileSync(
  path.join(OUT, "catalog.json"),
  JSON.stringify(CATALOG, null, 2),
  "utf8",
);

console.log("done", mapLog.length, "→", OUT);
console.log("video audit:", videoAudit.length, "products with video");
