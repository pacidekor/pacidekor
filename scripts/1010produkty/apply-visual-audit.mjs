/**
 * Apply visual-audit.json → catalog + ready info (+ merge 003→002)
 *
 * Usage: node scripts/1010produkty/apply-visual-audit.mjs
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const ROOT = path.resolve(".");
const SCRIPT = path.join(ROOT, "scripts/1010produkty");
const READY = path.join(ROOT, "public/1010produkty-ready");
const AUDIT = JSON.parse(
  fs.readFileSync(
    path.join(SCRIPT, "validation-reports/visual-audit.json"),
    "utf8",
  ),
);
const catalog = JSON.parse(
  fs.readFileSync(path.join(SCRIPT, "catalog.json"), "utf8"),
);

function noEm(s) {
  return String(s || "")
    .replace(/[\u2013\u2014\u2015]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function parseFarby(farby, imageCount) {
  if (!farby) {
    return [
      {
        color: "prírodná",
        photos: Array.from({ length: imageCount }, (_, i) => i + 1),
      },
    ];
  }
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

function writeInfo(p, farbyLine, note) {
  const idPad = String(p.id).padStart(3, "0");
  const dest = path.join(READY, idPad);
  const lines = [
    `Názov: ${noEm(p.name)}`,
    `Popis: ${noEm(p.description)}`,
    `Farby: ${noEm(farbyLine)}`,
    `Druh: ${noEm(p.druh)}`,
    `Kategória: ${noEm(p.category)}`,
    `Subkategória: ${noEm(p.subcategory)}`,
    `Zdrojová zložka: ${p.sourceFolder}`,
    `Zdrojová cesta: ${p.sourcePath}`,
    `Dávka: ${p.batch}${p.group ? ` / ${p.group}` : ""}`,
    note ? `Poznámka: ${noEm(note)}` : null,
  ].filter(Boolean);
  fs.writeFileSync(path.join(dest, "info.txt"), lines.join("\n") + "\n", "utf8");
}

// --- merge 003 → 002 ---
const keepDir = path.join(READY, "002");
const absorbDir = path.join(READY, "003");
const keepWebps = fs
  .readdirSync(keepDir)
  .filter((f) => /^\d+\.webp$/i.test(f))
  .sort((a, b) => Number(a) - Number(b));
const absorbWebps = fs
  .readdirSync(absorbDir)
  .filter((f) => /^\d+\.webp$/i.test(f))
  .sort((a, b) => Number(a) - Number(b));

let nextN = keepWebps.length + 1;
for (const w of absorbWebps) {
  const src = path.join(absorbDir, w);
  const dest = path.join(keepDir, `${nextN}.webp`);
  // re-encode copy to avoid locked handles
  const buf = await sharp(fs.readFileSync(src))
    .rotate()
    .webp({ quality: 82, effort: 4 })
    .toBuffer();
  fs.writeFileSync(dest, buf);
  console.log("merge copy", w, "→ 002/" + nextN + ".webp");
  nextN += 1;
}
const mergedCount = nextN - 1;
console.log("002 image count after merge:", mergedCount);

// mark 003 as merged-out
fs.writeFileSync(
  path.join(absorbDir, "info.txt"),
  [
    "Názov: (zlúčené do 002)",
    "Popis: Tento ready pack sa neimportuje - fotky sú v 002.",
    "Farby: -",
    "Druh:",
    "Kategória: Umelé kvety",
    "Subkategória: Doplnky",
    "Zdrojová zložka: 3",
    "Poznámka: merged-into:002",
    "",
  ].join("\n"),
  "utf8",
);

const byId = Object.fromEntries(catalog.map((p) => [String(p.id).padStart(3, "0"), p]));
const skipImport = new Set(["003"]);

for (const a of AUDIT.products) {
  const p = byId[a.id];
  if (!p) continue;

  if (a.mergeRole === "absorb" || a.verdict === "merge_with" && a.mergeWith && a.mergeRole !== "keep") {
    if (a.id === "003") {
      p.name = "(zlúčené do 002)";
      p.notes = "merged-into:002 — neimportovať";
      p.skipImport = true;
      skipImport.add("003");
      console.log("skip import", a.id);
      continue;
    }
  }

  if (a.proposedName) p.name = a.proposedName;
  if (a.proposedDescription) p.description = a.proposedDescription;
  if (a.proposedCategory) p.category = a.proposedCategory;
  if (a.proposedSubcategory != null && a.proposedSubcategory !== "") {
    p.subcategory = a.proposedSubcategory;
  }
  if (a.proposedDruh) p.druh = a.proposedDruh;

  const imgCount =
    a.id === "002"
      ? mergedCount
      : fs
          .readdirSync(path.join(READY, a.id))
          .filter((f) => /^\d+\.webp$/i.test(f)).length;

  const farby = a.proposedFarby || (() => {
    const info = fs.readFileSync(path.join(READY, a.id, "info.txt"), "utf8");
    return (info.match(/^Farby:\s*(.*)$/m) || [])[1] || "";
  })();

  p.groups = parseFarby(farby, imgCount);
  p.imageCount = imgCount;
  p.confidence = a.confidence;
  p.notes = a.notes || p.notes || "";
  if (a.id === "002") {
    p.sourceFolder = "2+3";
    p.notes = (a.notes || "") + " | merged photos from 003 as 8-14";
  }

  writeInfo(p, farby, p.notes);
  console.log("updated", a.id, p.name, "|", farby);
}

fs.writeFileSync(path.join(SCRIPT, "catalog.json"), JSON.stringify(catalog, null, 2), "utf8");
fs.writeFileSync(path.join(READY, "catalog.json"), JSON.stringify(catalog, null, 2), "utf8");
fs.writeFileSync(
  path.join(SCRIPT, "validation-reports/skip-import.json"),
  JSON.stringify([...skipImport], null, 2),
  "utf8",
);

// refresh PREHLAD
const lines = [
  "# Dávka 1010 — po vizuálnom audite",
  "",
  "Importovať: **31** produktov (003 zlúčené do 002).",
  "",
  "| ID | Názov | Farby | Fotiek | Verdikt |",
  "|---|---|---|---|---|",
];
for (const a of AUDIT.products) {
  const p = byId[a.id];
  if (!p) continue;
  const farby = (p.groups || []).map((g) => g.color).join(", ");
  const verdict =
    a.id === "003" ? "SKIP (merge→002)" : a.verdict === "yes" ? "OK" : "opravené";
  lines.push(
    `| ${a.id} | ${p.name} | ${farby || "-"} | ${p.imageCount || "-"} | ${verdict} |`,
  );
}
lines.push(
  "",
  "## Zmeny",
  "- 002+003 zlúčené (14 fotiek, farby biela/žltá/ružová)",
  "- 012 a 021: jedna farba (nie dve)",
  "- Multi-color Farby premapované podľa sheetov",
  "- 029: názov + subkategória Doplnky",
  "",
  "Import až po tvojom OK.",
);
fs.writeFileSync(path.join(SCRIPT, "PREHLAD.md"), lines.join("\n"), "utf8");

console.log("\ndone. skip:", [...skipImport].join(","));
console.log("import candidates: 31 (001-032 without 003)");
