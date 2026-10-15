/**
 * Kompletní kontrola public/910produkty-ready
 */
import fs from "fs";
import path from "path";

const ROOT = path.resolve(".");
const READY = path.join(ROOT, "public/910produkty-ready");
const CATALOG = JSON.parse(
  fs.readFileSync(path.join(ROOT, "scripts/910produkty/catalog.json"), "utf8"),
);
const OUT = path.join(ROOT, "scripts/910produkty/validation-reports");
fs.mkdirSync(OUT, { recursive: true });

const CATEGORIES = new Set([
  "Umelé kvety",
  "Sušina",
  "Stuhy",
  "Aranž. materiál",
  "Obalový materiál",
  "Keramika",
  "Vencové základy",
  "Košíky",
  "Svietniky",
  "Flowerboxy",
]);

// Known subcategory labels from taxonomy.ts (loose match by label)
const SUB_BY_CAT = {
  "Umelé kvety": ["Kytice", "Stopkové kvety", "Venčovky", "Listy", "Doplnky"],
  Sušina: [],
  Stuhy: [
    "Dekoratívne stuhy",
    "Saténové stuhy",
    "Pohrebné stuhy",
    "Látkové pohrebné stuhy",
    "Jutové stuhy",
    "Sametové stuhy",
    "Viazačky",
    "Kárované stuhy",
    "Margarétkové stuhy",
    "Čipkové stuhy",
    "Rypsové stuhy",
    "Sieťované stuhy",
    "Šifónové stuhy",
    "Dekoračné šnúry",
  ],
  "Aranž. materiál": ["Doplnky", "Perličky"],
  "Obalový materiál": [
    "Fólie",
    "Fólie hárky",
    "Sieťka plastová",
    "Sieťka hačkovaná",
    "Sisalová sieťka",
    "Jutová sieťka",
    "Papierová rolka",
    "Papierová rolka rozťahovacia",
    "Papier hárky",
    "Čipková rolka",
    "Doplnky",
  ],
  Keramika: [],
  "Vencové základy": [
    "Prútené vence",
    "Umelé vence",
    "Machové vence",
    "Prútené srdcia",
    "Slamené vence",
  ],
  Košíky: [],
  Svietniky: [],
  Flowerboxy: [
    "Okrúhle",
    "Srdce",
    "Tašky na kvety",
    "Hranaté",
    "Štvorcové",
    "Semišové",
  ],
};

const COLOR_WORDS =
  /\b(biel[aá]|červen[aá]|ružov[aá]|fialov[aá]|zelen[aá]|krémov[aá]|oranžov[aá]|žlt[aá]|modr[aá]|hned[aá]|siv[aá]|šed[aá]|bordov[aá]|zlat[aá]|strieborn[aá]|béžov[aá]|čiern[aá]|broskyňov[aá]|prírodn[aá])\b/i;
const COUNT_WORDS =
  /\b(\d+\s*(ks|kusov|ks\.|balení|balenie)|sada\s+\d+|balenie\s+\d+)\b/i;

function parseInfo(txt) {
  const out = {};
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^([^:]+):\s*(.*)$/);
    if (m) out[m[1].trim()] = m[2].trim();
  }
  return out;
}

function parseFarby(farby) {
  if (!farby) return [];
  return farby
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^(.+?)\s*\[([^\]]+)\]\s*$/);
      if (!m) return { color: part.toLowerCase(), photos: [], raw: part };
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
      return { color, photos: [...new Set(photos)].sort((a, b) => a - b), raw: part };
    });
}

function listWebps(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => /^\d+\.webp$/i.test(f))
    .map((f) => Number(f.replace(/\D/g, "")))
    .sort((a, b) => a - b);
}

const report = {
  summary: {},
  structural: [],
  infoMissing: [],
  badCategory: [],
  unknownSubcategory: [],
  emptyFarby: [],
  farbyNoBracket: [],
  photoIndexOob: [],
  photoGaps: [],
  uncoveredPhotos: [],
  overlappingColors: [],
  duplicateColorNames: [],
  descHasColor: [],
  descHasCount: [],
  emDash: [],
  stubName: [],
  shortDesc: [],
  duplicateNames: [],
  lowConfidence: [],
  videoMismatch: [],
  catalogVsReady: [],
  multiColorSuspect: [],
  greenAsColorOnFlowers: [],
};

const nameMap = new Map();
const folders = fs
  .readdirSync(READY, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^\d{3}$/.test(d.name))
  .map((d) => d.name)
  .sort();

report.summary.folderCount = folders.length;
report.summary.catalogCount = CATALOG.length;

for (const idPad of folders) {
  const id = Number(idPad);
  const dir = path.join(READY, idPad);
  const files = fs.readdirSync(dir);
  const webps = listWebps(dir);
  const infoPath = path.join(dir, "info.txt");
  const cat = CATALOG.find((c) => c.id === id);

  if (!fs.existsSync(infoPath)) {
    report.infoMissing.push({ id: idPad, issue: "missing info.txt" });
    continue;
  }
  const raw = fs.readFileSync(infoPath, "utf8");
  const info = parseInfo(raw);
  const required = ["Názov", "Popis", "Farby", "Kategória"];
  for (const k of required) {
    if (!info[k]) report.infoMissing.push({ id: idPad, field: k });
  }

  // consecutive webps 1..n
  for (let i = 0; i < webps.length; i++) {
    if (webps[i] !== i + 1) {
      report.photoGaps.push({ id: idPad, webps });
      break;
    }
  }
  if (webps.length === 0) {
    report.structural.push({ id: idPad, issue: "no webp" });
  }

  if (cat && cat.imageCount !== webps.length) {
    report.catalogVsReady.push({
      id: idPad,
      catalog: cat.imageCount,
      ready: webps.length,
    });
  }

  // videos
  const vids = files.filter((f) => /^video-\d+\./i.test(f));
  if (cat?.videos?.length && vids.length !== cat.videos.length) {
    report.videoMismatch.push({
      id: idPad,
      expected: cat.videos.length,
      found: vids.length,
    });
  }
  if (!cat?.videos?.length && vids.length) {
    report.videoMismatch.push({
      id: idPad,
      expected: 0,
      found: vids.length,
      note: "unexpected video",
    });
  }

  // category
  if (info["Kategória"] && !CATEGORIES.has(info["Kategória"])) {
    report.badCategory.push({ id: idPad, category: info["Kategória"] });
  }

  const sub = info["Subkategória"] || "";
  const catLabel = info["Kategória"] || "";
  const knownSubs = SUB_BY_CAT[catLabel];
  if (sub && knownSubs && knownSubs.length > 0 && !knownSubs.includes(sub)) {
    // allow freeform for categories without fixed subs, flag only when list exists
    report.unknownSubcategory.push({
      id: idPad,
      category: catLabel,
      subcategory: sub,
    });
  }

  // farby
  const farby = parseFarby(info["Farby"] || "");
  if (!farby.length || !info["Farby"]) {
    report.emptyFarby.push({ id: idPad });
  }
  const colorNames = farby.map((f) => f.color);
  if (new Set(colorNames).size !== colorNames.length) {
    report.duplicateColorNames.push({ id: idPad, colors: colorNames });
  }

  const covered = new Set();
  const photoOwner = new Map();
  for (const g of farby) {
    if (!g.photos.length && g.raw.includes("[")) {
      // empty brackets weird
    }
    if (g.raw && !/\[[^\]]+\]/.test(g.raw) && farby.length >= 1) {
      // single color without brackets is ok-ish but flag if multi
      if (farby.length > 1 || webps.length > 1) {
        report.farbyNoBracket.push({ id: idPad, raw: g.raw });
      }
    }
    for (const ph of g.photos) {
      if (ph < 1 || ph > webps.length) {
        report.photoIndexOob.push({ id: idPad, photo: ph, max: webps.length, color: g.color });
      }
      if (photoOwner.has(ph) && photoOwner.get(ph) !== g.color) {
        report.overlappingColors.push({
          id: idPad,
          photo: ph,
          colors: [photoOwner.get(ph), g.color],
        });
      } else {
        photoOwner.set(ph, g.color);
      }
      covered.add(ph);
    }
  }

  for (let i = 1; i <= webps.length; i++) {
    if (!covered.has(i) && farby.some((f) => f.photos.length)) {
      report.uncoveredPhotos.push({ id: idPad, photo: i, total: webps.length });
    }
  }

  // description quality
  const desc = info["Popis"] || "";
  const name = info["Názov"] || "";
  if (COLOR_WORDS.test(desc)) report.descHasColor.push({ id: idPad, desc });
  if (COUNT_WORDS.test(desc)) report.descHasCount.push({ id: idPad, desc });
  if (/[\u2013\u2014\u2015]/.test(raw)) report.emDash.push({ id: idPad });
  if (!name || /doplní|TODO|\(tmp\)|untitled/i.test(name)) {
    report.stubName.push({ id: idPad, name });
  }
  if (desc.length < 40) report.shortDesc.push({ id: idPad, desc, len: desc.length });

  const nk = name.toLowerCase().trim();
  if (!nameMap.has(nk)) nameMap.set(nk, []);
  nameMap.get(nk).push(idPad);

  if (cat && cat.confidence > 0 && cat.confidence < 0.7) {
    report.lowConfidence.push({
      id: idPad,
      confidence: cat.confidence,
      name,
    });
  }

  // multi-color with many photos - needs human review of mapping
  if (farby.length >= 3 && webps.length >= 6) {
    report.multiColorSuspect.push({
      id: idPad,
      name,
      colors: farby.map((f) => `${f.color}[${f.photos.join(",")}]`),
      images: webps.length,
    });
  }

  // flower products where "zelená" is a color variant (often foliage, not variant)
  if (
    catLabel === "Umelé kvety" &&
    farby.some((f) => f.color.startsWith("zelen")) &&
    farby.length >= 2
  ) {
    report.greenAsColorOnFlowers.push({
      id: idPad,
      name,
      colors: farby.map((f) => f.color),
    });
  }
}

for (const [name, ids] of nameMap) {
  if (ids.length > 1) {
    report.duplicateNames.push({ name, ids });
  }
}

// totals
const counts = {};
for (const [k, v] of Object.entries(report)) {
  if (k === "summary") continue;
  counts[k] = Array.isArray(v) ? v.length : 0;
}
report.summary.issueCounts = counts;
report.summary.totalIssueRows = Object.values(counts).reduce((a, b) => a + b, 0);

// severity buckets for k-overeni
const kOvereni = [];

function addKO(id, severity, reason, extra = {}) {
  kOvereni.push({ id, severity, reason, ...extra });
}

for (const x of report.photoIndexOob) addKO(x.id, "error", "foto index mimo rozsah", x);
for (const x of report.photoGaps) addKO(x.id, "error", "nekonsecutivní webp", x);
for (const x of report.infoMissing) addKO(x.id, "error", "chybí info pole", x);
for (const x of report.badCategory) addKO(x.id, "error", "neplatná kategória", x);
for (const x of report.emptyFarby) addKO(x.id, "warn", "prázdne Farby", x);
for (const x of report.overlappingColors)
  addKO(x.id, "warn", "prekrývajúce sa farby na fotke", x);
for (const x of report.uncoveredPhotos)
  addKO(x.id, "warn", "foto bez farby", x);
for (const x of report.descHasColor) addKO(x.id, "warn", "popis obsahuje farbu", x);
for (const x of report.descHasCount) addKO(x.id, "warn", "popis obsahuje počet", x);
for (const x of report.greenAsColorOnFlowers)
  addKO(x.id, "review", "zelená ako farebný variant u kvetov (možno lístie)", x);
for (const x of report.multiColorSuspect)
  addKO(x.id, "review", "viac farieb + veľa fotiek – overiť mapovanie", x);
for (const x of report.duplicateNames)
  for (const id of x.ids) addKO(id, "review", `duplicitný názov: ${x.name}`, x);
for (const x of report.unknownSubcategory)
  addKO(x.id, "info", "subkategória mimo pevného zoznamu (OK ak custom)", x);
for (const x of report.lowConfidence)
  addKO(x.id, "review", "nízka confidence", x);
for (const x of report.shortDesc) addKO(x.id, "info", "krátky popis", x);
for (const x of report.videoMismatch)
  addKO(x.id, "error", "nesúlad videa", x);

// dedupe k-overeni by id+reason
const seen = new Set();
const kOvereniUnique = [];
for (const row of kOvereni) {
  const key = `${row.id}|${row.reason}`;
  if (seen.has(key)) continue;
  seen.add(key);
  kOvereniUnique.push(row);
}

const bySeverity = { error: 0, warn: 0, review: 0, info: 0 };
for (const r of kOvereniUnique) bySeverity[r.severity] = (bySeverity[r.severity] || 0) + 1;
report.summary.bySeverity = bySeverity;
report.summary.kOvereniCount = kOvereniUnique.length;

fs.writeFileSync(
  path.join(OUT, "validation-full.json"),
  JSON.stringify({ ...report, kOvereni: kOvereniUnique }, null, 2),
  "utf8",
);
fs.writeFileSync(
  path.join(OUT, "k-overeni.json"),
  JSON.stringify(kOvereniUnique, null, 2),
  "utf8",
);

// markdown reports
const md = [];
md.push("# Validácia ready packu 910produkty");
md.push("");
md.push(`- Produktov (zložky): **${report.summary.folderCount}**`);
md.push(`- Položiek v catalog.json: **${report.summary.catalogCount}**`);
md.push(`- Nálezov (riadky): **${report.summary.totalIssueRows}**`);
md.push(
  `- K overeniu: **${kOvereniUnique.length}** (error ${bySeverity.error || 0}, warn ${bySeverity.warn || 0}, review ${bySeverity.review || 0}, info ${bySeverity.info || 0})`,
);
md.push("");
md.push("## Počty podľa typu");
md.push("");
md.push("| Typ | Počet |");
md.push("|-----|------:|");
for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  if (v === 0) continue;
  md.push(`| ${k} | ${v} |`);
}
md.push("");

function section(title, rows, fmt) {
  if (!rows.length) return;
  md.push(`## ${title} (${rows.length})`);
  md.push("");
  for (const r of rows.slice(0, 80)) md.push(`- ${fmt(r)}`);
  if (rows.length > 80) md.push(`- … +${rows.length - 80} ďalších`);
  md.push("");
}

section("ERROR – foto index mimo", report.photoIndexOob, (r) =>
  `**${r.id}** foto ${r.photo} (max ${r.max}) farba ${r.color}`,
);
section("ERROR – medzery vo webp", report.photoGaps, (r) =>
  `**${r.id}** webps: ${r.webps.join(",")}`,
);
section("ERROR – info", report.infoMissing, (r) =>
  `**${r.id}** ${r.field || r.issue}`,
);
section("ERROR – kategória", report.badCategory, (r) =>
  `**${r.id}** \`${r.category}\``,
);
section("ERROR – video", report.videoMismatch, (r) =>
  `**${r.id}** expected ${r.expected}, found ${r.found}`,
);
section("WARN – prekrývajúce farby", report.overlappingColors, (r) =>
  `**${r.id}** foto ${r.photo}: ${r.colors.join(" + ")}`,
);
section("WARN – nepokryté fotky", report.uncoveredPhotos, (r) =>
  `**${r.id}** foto ${r.photo}/${r.total}`,
);
section("WARN – popis má farbu", report.descHasColor, (r) =>
  `**${r.id}** ${r.desc.slice(0, 100)}`,
);
section("WARN – popis má počet", report.descHasCount, (r) =>
  `**${r.id}** ${r.desc.slice(0, 100)}`,
);
section("REVIEW – zelená u kvetov", report.greenAsColorOnFlowers, (r) =>
  `**${r.id}** ${r.name} → ${r.colors.join(", ")}`,
);
section("REVIEW – multi-color", report.multiColorSuspect, (r) =>
  `**${r.id}** ${r.name} (${r.images} fotiek): ${r.colors.join(" | ")}`,
);
section("REVIEW – duplicitné názvy", report.duplicateNames, (r) =>
  `\`${r.name}\` → ${r.ids.join(", ")}`,
);
section("INFO – neznáma subkategória", report.unknownSubcategory, (r) =>
  `**${r.id}** ${r.category} / ${r.subcategory}`,
);
section("INFO – krátky popis", report.shortDesc, (r) =>
  `**${r.id}** (${r.len}) ${r.desc}`,
);

md.push("## K overeniu – errors + warns (priorita)");
md.push("");
const prio = kOvereniUnique.filter((r) => r.severity === "error" || r.severity === "warn");
for (const r of prio.slice(0, 120)) {
  md.push(`- **${r.id}** [${r.severity}] ${r.reason}`);
}
if (prio.length > 120) md.push(`- … +${prio.length - 120}`);

fs.writeFileSync(path.join(OUT, "souhrn.md"), md.join("\n"), "utf8");
fs.mkdirSync(path.join(READY, "_reports"), { recursive: true });
fs.writeFileSync(path.join(READY, "_reports/souhrn-validace.md"), md.join("\n"), "utf8");
fs.writeFileSync(
  path.join(READY, "_reports/k-overeni.json"),
  JSON.stringify(kOvereniUnique, null, 2),
  "utf8",
);

console.log(JSON.stringify(report.summary, null, 2));
console.log("wrote", OUT);
console.log("errors+warns", prio.length);
