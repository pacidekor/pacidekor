/**
 * Apply ChatGPT visual audit JSON → ready info.txt + catalog.json
 *
 * Usage:
 *   node scripts/910produkty/apply-chatgpt-audit.mjs "c:/Users/tomas/Downloads/PACIDEKOR-910-vizualny-audit-51-produktov.json"
 */
import fs from "fs";
import path from "path";

const ROOT = path.resolve(".");
const READY = path.join(ROOT, "public/910produkty-ready");
const CATALOG_PATH = path.join(ROOT, "scripts/910produkty/catalog.json");
const auditPath = process.argv[2];
if (!auditPath || !fs.existsSync(auditPath)) {
  console.error("Usage: node scripts/910produkty/apply-chatgpt-audit.mjs <audit.json>");
  process.exit(1);
}

const audit = JSON.parse(fs.readFileSync(auditPath, "utf8"));
const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
const byId = new Map(catalog.map((p) => [String(p.id).padStart(3, "0"), p]));

fs.copyFileSync(
  auditPath,
  path.join(ROOT, "scripts/910produkty/validation-reports/chatgpt-audit.json"),
);

function parseFarbyToGroups(farby, imageCount) {
  if (!farby) return [];
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

function updateInfoField(raw, key, value) {
  if (value == null || value === "") return raw;
  const re = new RegExp(`^${key}:.*$`, "m");
  const line = `${key}: ${String(value).replace(/[\u2013\u2014\u2015]/g, "-")}`;
  if (re.test(raw)) return raw.replace(re, line);
  return raw.trimEnd() + "\n" + line + "\n";
}

const applied = [];
const skipped = [];
const importIds = [];

for (const p of audit.products || []) {
  const id = String(p.id).padStart(3, "0");
  const verdict = p.verdict;
  const infoPath = path.join(READY, id, "info.txt");
  if (!fs.existsSync(infoPath)) {
    skipped.push({ id, reason: "missing folder" });
    continue;
  }

  if (verdict === "needs_human" || verdict === "no_split_needed") {
    skipped.push({ id, verdict, reason: p.notes || p.humanQuestion || verdict });
    continue;
  }

  if (verdict !== "yes" && verdict !== "yes_after_fix") {
    skipped.push({ id, verdict, reason: "unknown verdict" });
    continue;
  }

  let raw = fs.readFileSync(infoPath, "utf8");
  const changes = {};

  if (verdict === "yes_after_fix") {
    if (p.proposedFarby) {
      raw = updateInfoField(raw, "Farby", p.proposedFarby);
      changes.farby = p.proposedFarby;
    }
    if (p.proposedName) {
      raw = updateInfoField(raw, "Názov", p.proposedName);
      changes.name = p.proposedName;
    }
    if (p.proposedDescription) {
      raw = updateInfoField(raw, "Popis", p.proposedDescription);
      changes.description = p.proposedDescription;
    }
    if (p.proposedCategory) {
      raw = updateInfoField(raw, "Kategória", p.proposedCategory);
      changes.category = p.proposedCategory;
    }
    if (p.proposedSubcategory) {
      raw = updateInfoField(raw, "Subkategória", p.proposedSubcategory);
      changes.subcategory = p.proposedSubcategory;
    }
  }

  raw = raw.replace(/[\u2013\u2014\u2015]/g, "-");
  fs.writeFileSync(infoPath, raw, "utf8");

  const cat = byId.get(id);
  if (cat) {
    const webps = fs
      .readdirSync(path.join(READY, id))
      .filter((f) => /^\d+\.webp$/i.test(f)).length;
    if (changes.farby) {
      cat.groups = parseFarbyToGroups(changes.farby, webps);
    }
    if (changes.name) cat.name = changes.name;
    if (changes.description) cat.description = changes.description;
    if (changes.category) cat.category = changes.category;
    if (changes.subcategory) cat.subcategory = changes.subcategory;
    cat.auditVerdict = verdict;
    cat.auditConfidence = p.confidence;
  }

  applied.push({ id, verdict, changes });
  importIds.push(Number(id));
}

fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2), "utf8");

const report = {
  applied: applied.length,
  skipped: skipped.length,
  importIds: importIds.sort((a, b) => a - b),
  importIdsPadded: importIds
    .sort((a, b) => a - b)
    .map((n) => String(n).padStart(3, "0")),
  appliedDetails: applied,
  skippedDetails: skipped,
  summary: audit.summary,
};

fs.writeFileSync(
  path.join(ROOT, "scripts/910produkty/validation-reports/audit-apply-report.json"),
  JSON.stringify(report, null, 2),
  "utf8",
);

console.log("applied", applied.length);
console.log("skipped (human/split)", skipped.length);
console.log(
  "import --only",
  importIds.sort((a, b) => a - b).join(","),
);
for (const s of skipped) {
  console.log("SKIP", s.id, s.verdict, (s.reason || "").slice(0, 80));
}
