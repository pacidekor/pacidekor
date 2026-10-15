/**
 * Merge vision catalog draft into catalog.json + rewrite ready info.txt
 * (does not re-encode images; run export-ready --force if photo order must change)
 */
import fs from "fs";
import path from "path";

const ROOT = path.resolve(".");
const SCRIPT = path.join(ROOT, "scripts/1010produkty");
const READY = path.join(ROOT, "public/1010produkty-ready");
const draftPath = process.argv[2] || path.join(SCRIPT, "catalog-draft.json");

const draft = JSON.parse(fs.readFileSync(draftPath, "utf8"));
const catalog = JSON.parse(fs.readFileSync(path.join(SCRIPT, "catalog.json"), "utf8"));
const byId = Object.fromEntries(draft.map((d) => [d.id, d]));

function noEm(s) {
  return String(s || "")
    .replace(/[\u2013\u2014\u2015]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function farbyLine(groups) {
  return (groups || [])
    .map((g) => {
      const photos = [...(g.photos || [])].sort((a, b) => a - b);
      if (!photos.length) return null;
      const start = photos[0];
      const end = photos[photos.length - 1];
      const contiguous = photos.every((n, i) => n === start + i);
      const range = contiguous
        ? start === end
          ? `[${start}]`
          : `[${start}-${end}]`
        : `[${photos.join(",")}]`;
      return `${noEm(g.color)} ${range}`;
    })
    .filter(Boolean)
    .join(" | ");
}

for (const p of catalog) {
  const d = byId[p.id];
  if (!d) continue;
  p.name = d.name;
  p.description = d.description;
  p.category = d.category;
  p.subcategory = d.subcategory || "";
  p.druh = d.druh || "";
  p.groups = d.groups;
  p.confidence = d.confidence;
  p.notes = d.notes || "";
  p.imageCount = Math.max(
    ...(d.groups || []).flatMap((g) => g.photos || []),
    p.imageCount || 0,
  );

  const idPad = String(p.id).padStart(3, "0");
  const dest = path.join(READY, idPad);
  if (!fs.existsSync(dest)) continue;

  const info = [
    `Názov: ${noEm(p.name)}`,
    `Popis: ${noEm(p.description)}`,
    `Farby: ${farbyLine(p.groups)}`,
    `Druh: ${noEm(p.druh)}`,
    `Kategória: ${noEm(p.category)}`,
    `Subkategória: ${noEm(p.subcategory)}`,
    `Zdrojová zložka: ${p.sourceFolder}`,
    `Zdrojová cesta: ${p.sourcePath}`,
    `Dávka: ${p.batch}${p.group ? ` / ${p.group}` : ""}`,
    p.notes ? `Poznámka: ${noEm(p.notes)}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  fs.writeFileSync(path.join(dest, "info.txt"), info + "\n", "utf8");
  console.log("updated", idPad, p.name);
}

fs.writeFileSync(path.join(SCRIPT, "catalog.json"), JSON.stringify(catalog, null, 2), "utf8");
fs.writeFileSync(path.join(READY, "catalog.json"), JSON.stringify(catalog, null, 2), "utf8");
console.log("catalog updated", catalog.length);
