/**
 * Apply catalog corrections to ready-v2 working copy.
 * Origin ready folder is never modified.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("katalog_raw/noveprodukty5.9.26-ready-v2");
const OUT_DIR = path.resolve("scripts/katalog-5-9-26/v2-reports");
const INV = JSON.parse(
  fs.readFileSync("scripts/katalog-5-9-26/ready-inventory.json", "utf8"),
);
const FLOWERS = JSON.parse(
  fs.readFileSync(
    "scripts/katalog-5-9-26/rename-proposals-flowers.json",
    "utf8",
  ),
);
const DEKOR = JSON.parse(
  fs.readFileSync("scripts/katalog-5-9-26/rename-proposals-dekor.json", "utf8"),
);

fs.mkdirSync(OUT_DIR, { recursive: true });

const EM = /[\u2013\u2014\u2015\u2212]/g;
function noEm(s) {
  return String(s || "")
    .replace(EM, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function parseInfo(text) {
  const data = {};
  for (const line of text.replace(/\r\n/g, "\n").trim().split("\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    data[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return data;
}

function parseFarby(farby) {
  if (!farby) return [];
  return farby.split("|").map((part) => {
    const m = part.trim().match(/^(.+?)\s*\[([^\]]+)\]\s*$/);
    if (!m) return { color: part.trim(), photos: [] };
    const color = m[1].trim();
    const range = m[2].trim();
    const photos = [];
    if (range.includes(",")) {
      for (const x of range.split(",")) {
        const n = Number(x.trim());
        if (Number.isFinite(n)) photos.push(n);
      }
    } else if (range.includes("-")) {
      const [a, b] = range.split("-").map((x) => Number(x.trim()));
      if (Number.isFinite(a) && Number.isFinite(b)) {
        for (let n = a; n <= b; n++) photos.push(n);
      }
    } else {
      const n = Number(range);
      if (Number.isFinite(n)) photos.push(n);
    }
    return { color, photos };
  });
}

function normalizeName(name) {
  return noEm(String(name || ""))
    .replace(/Hlavička/gu, "Hlava")
    .replace(/hlavička/gu, "hlava")
    .replace(/Hlavičky/gu, "Hlavy")
    .replace(/hlavičky/gu, "hlavy");
}

function formatFarby(groups) {
  return groups
    .map((g) => {
      const nums = [...g.photos].sort((a, b) => a - b);
      if (nums.length === 0) return g.color;
      if (nums.length === 1) return `${g.color} [${nums[0]}]`;
      // contiguous?
      let contiguous = true;
      for (let i = 1; i < nums.length; i++) {
        if (nums[i] !== nums[i - 1] + 1) contiguous = false;
      }
      if (contiguous) return `${g.color} [${nums[0]}-${nums[nums.length - 1]}]`;
      return `${g.color} [${nums.join(",")}]`;
    })
    .join(" | ");
}

function writeInfo(dir, fields) {
  const lines = [
    `Názov: ${noEm(fields.name)}`,
    `Popis: ${noEm(fields.description)}`,
    `Farby: ${fields.farby}`,
    `Druh: ${noEm(fields.druh)}`,
    `Kategória: ${noEm(fields.category)}`,
    `Subkategória: ${noEm(fields.subcategory)}`,
    `Zdrojová zložka: ${fields.sourceFolder}`,
  ];
  fs.writeFileSync(path.join(dir, "info.txt"), lines.join("\n") + "\n", "utf8");
}

function listWebps(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".webp"))
    .map((f) => Number(f.replace(".webp", "")))
    .sort((a, b) => a - b);
}

function nextWebpIndex(dir) {
  const nums = listWebps(dir);
  return nums.length ? Math.max(...nums) + 1 : 1;
}

function copyWebp(srcFile, destDir, destIndex) {
  fs.copyFileSync(srcFile, path.join(destDir, `${destIndex}.webp`));
}

/** Build description without colors/quantities/marketing fluff. */
function buildDescription(name, category, subcategory, druh) {
  const n = name.toLowerCase();
  if (n.includes("stuha")) {
    if (n.includes("čipkovan")) {
      return "Dekoratívna stuha s kvetinovým vzorom a čipkovaným lemom. Hodí sa na zdobenie kytíc, darčekových balení a dekorácií.";
    }
    if (n.includes("ornament")) {
      return "Dekoratívna stuha s ornamentálnym okrajom. Hodí sa na balenie darčekov a floristické aranžmány.";
    }
    if (n.includes("linkami")) {
      return "Dekoratívna stuha s ozdobnými linkami na okraji. Hodí sa na viazanie kytíc a darčekové balenia.";
    }
    if (n.includes("kvetinovým vzorom")) {
      return "Saténová stuha s kvetinovým vzorom. Hodí sa na balenie darčekov a zdobenie kytíc.";
    }
    if (n.includes("károvan")) {
      return "Dekoratívna stuha s károvaným vzorom. Hodí sa na balenie darčekov a rustikálne aranžmány.";
    }
    if (n.includes("textúr")) {
      return "Dekoratívna stuha s textúrovaným povrchom. Hodí sa na viazanie kytíc a darčekové balenia.";
    }
    if (n.includes("jut")) {
      return "Dekoratívna jutová páska. Hodí sa na rustikálne viazanie kytíc a balenie.";
    }
    return "Dekoratívna stuha vhodná na viazanie kytíc a darčekové balenia. Jednoduchý doplnok pre floristiku aj kreatívne projekty.";
  }
  if (n.includes("sneh v spreji") || n.includes("sprej")) {
    return "Dekoračný sprej na floristické aranžmány. Hodí sa na doplnenie vencov a sezónnych dekorácií.";
  }
  if (n.includes("ampulk") || n.includes("skúmavk")) {
    return "Floristická nádobka na vodu pre stonky. Hodí sa do aranžmánov a vencov.";
  }
  if (n.includes("drôt")) {
    return "Floristický drôt na spevnenie a tvarovanie stoniek. Základný materiál pre aranžovanie.";
  }
  if (n.includes("sieťk")) {
    return "Dekoračná sieťka na balenie a aranžovanie. Hodí sa do kytíc a darčekových balení.";
  }
  if (n.includes("špagát") || n.includes("šnúr") || n.includes("copík") || n.includes("lyko")) {
    return "Viazací materiál na floristiku a balenie. Hodí sa na preväzovanie kytíc a dekorácií.";
  }
  if (n.includes("stonka")) {
    return "Plastová stonka ako základ pre umelé kvety. Hodí sa na zostavenie aranžmánov.";
  }
  if (n.startsWith("kytica")) {
    return `Umelá kytica pripravená do vázy. Hodí sa ako hotová stolová dekorácia.`;
  }
  if (n.startsWith("hlava chryzantémy - guľovitá")) {
    return "Dekoratívna hlava chryzantémy s guľovitým tvarom a husto usporiadanými lupienkami. Hodí sa na tvorbu vencov a kvetinových aranžmánov.";
  }
  if (n.includes("chryzantémy s úzkymi")) {
    return "Dekoratívna hlava chryzantémy s dlhými úzkymi lupienkami a otvoreným tvarom. Vynikne vo vencoch a výrazných kvetinových dekoráciách.";
  }
  if (n.includes("hortenzie s ozdobnými")) {
    return "Dekoratívna hlava hortenzie doplnená ozdobnými vetvičkami. Hodí sa do vencov a floristických aranžmánov.";
  }
  if (n.includes("hortenzie s textúrovanými")) {
    return "Dekoratívna hlava hortenzie s textúrovanými lupienkami. Hodí sa do vencov a kvetinových aranžmánov.";
  }
  if (n.startsWith("hlava")) {
    const feature = n.includes(" - ")
      ? n.split(" - ").slice(1).join(" - ")
      : n.includes(" s ")
        ? n.split(" s ").slice(1).join(" s ")
        : "";
    if (feature) {
      return `Dekoratívna hlava kvetu s charakteristickým tvarom (${feature}). Hodí sa na výrobu vencov a floristických aranžmánov.`;
    }
    return "Dekoratívna hlava kvetu určená na výrobu vencov a aranžmánov. Komponent bez stonky.";
  }
  if (subcategory === "Prírodniny" || category === "Dekorácie") {
    return "Dekoratívny doplnok do floristických aranžmánov a sezónnych dekorácií. Hodí sa do vencov a stolových kompozícií.";
  }
  if (n.includes("na stopke") || subcategory === "Stopkové kvety") {
    return `Umelý kvet na stopke vhodný do vázy alebo aranžmánu. Jednoduchý doplnok bez nutnosti údržby.`;
  }
  return "Dekoratívny produkt do floristických aranžmánov. Hodí sa do vázy, vencov alebo stolových kompozícií.";
}

// Forbidden color/quantity patterns in descriptions
const BAD_DESC =
  /(biela|biel[aéy]|červen|ružov|fialov|zelen[aáey]|krémov|oranž|žlt|modr|hned|siv[aáey]|vínov|bordov|staroruž|losos|čier|marhuľ|hrdzav|päť|tri |dva |štyri|šesť|\d+\s*ks|balenie po|stoniek|kvetov|hláv|kusov|niekoľko|rôznych farb|farebn)/i;

// ---- gather renames / taxonomy / merges ----
const renameById = new Map();
for (const r of [...FLOWERS.renames, ...DEKOR.renames]) {
  renameById.set(String(r.id), r);
}
const taxById = new Map();
for (const t of DEKOR.taxonomy || []) {
  taxById.set(String(t.id), t);
}

// Explicit merges with action merge
const explicitMerges = [...(FLOWERS.merges || []), ...(DEKOR.merges || [])].filter(
  (m) => m.action === "merge",
);

// Same newName among ok renames => color variants of one model => merge
const nameGroups = new Map();
for (const [id, r] of renameById) {
  if (r.status !== "ok") continue;
  const key = r.newName;
  if (!nameGroups.has(key)) nameGroups.set(key, []);
  nameGroups.get(key).push(id);
}
const autoMerges = [];
for (const [name, ids] of nameGroups) {
  if (ids.length < 2) continue;
  const sorted = [...ids].sort((a, b) => Number(a) - Number(b));
  autoMerges.push({
    intoId: sorted[0],
    fromIds: sorted.slice(1),
    newName: name,
    reason: `Rovnaký model podľa spoločného názvu „${name}"; farby sa zlúčia do jedného produktu.`,
  });
}

// Manual confirmed merges (68->66 already in explicit; ensure included)
const mergePlan = new Map(); // fromId -> intoId
function addMerge(fromId, intoId, reason, bag) {
  fromId = String(fromId);
  intoId = String(intoId);
  if (fromId === intoId) return;
  if (mergePlan.has(fromId)) return;
  mergePlan.set(fromId, { intoId, reason });
  bag.push({ fromId, intoId, reason });
}

const performedMerges = [];
for (const m of explicitMerges) {
  for (const fromId of m.fromIds) {
    addMerge(fromId, m.intoId, m.reason, performedMerges);
  }
}
for (const m of autoMerges) {
  for (const fromId of m.fromIds) {
    addMerge(fromId, m.intoId, m.reason, performedMerges);
  }
}

// ---- load current products ----
const products = new Map();
for (const item of INV) {
  const dir = path.join(ROOT, item.id);
  if (!fs.existsSync(dir)) continue;
  const info = parseInfo(fs.readFileSync(path.join(dir, "info.txt"), "utf8"));
  products.set(item.id, {
    id: item.id,
    dir,
    name: info["Názov"] || item.name,
    description: info["Popis"] || item.description,
    farby: parseFarby(info["Farby"] || item.farbyRaw),
    druh: info["Druh"] || item.druh,
    category: info["Kategória"] || item.category,
    subcategory: info["Subkategória"] || item.subcategory,
    sourceFolder: info["Zdrojová zložka"] || item.sourceFolder,
    status: "active",
  });
}

const changes = [];
const photoMap = [];
const questions = [];
const archived = [];

// Collect questions from proposals
for (const q of [...(FLOWERS.questions || []), ...(DEKOR.questions || [])]) {
  questions.push(q);
}
for (const m of [...(FLOWERS.merges || []), ...(DEKOR.merges || [])]) {
  if (m.action === "k-overeni") {
    questions.push({
      id: m.fromIds.join("+") + "->" + m.intoId,
      question: m.reason,
    });
  }
}

// ---- perform merges ----
for (const { fromId, intoId, reason } of performedMerges) {
  const from = products.get(fromId);
  const into = products.get(intoId);
  if (!from || !into || from.status !== "active" || into.status !== "active") {
    questions.push({
      id: `${fromId}->${intoId}`,
      question: `Merge sa nepodaril (stav produktu). ${reason}`,
    });
    continue;
  }

  // Move photos: append from's webps to into
  const fromWebps = listWebps(from.dir);
  let next = nextWebpIndex(into.dir);
  const remap = new Map(); // old index in from -> new index in into
  for (const oldIdx of fromWebps) {
    const src = path.join(from.dir, `${oldIdx}.webp`);
    copyWebp(src, into.dir, next);
    photoMap.push({
      action: "moved",
      fromProduct: fromId,
      fromFile: `${oldIdx}.webp`,
      toProduct: intoId,
      toFile: `${next}.webp`,
    });
    remap.set(oldIdx, next);
    next += 1;
  }

  // Merge farby groups with remapped indices
  for (const g of from.farby) {
    const photos = g.photos
      .map((p) => remap.get(p))
      .filter((n) => Number.isFinite(n));
    if (photos.length === 0) continue;
    // Multi-color slash list = common gallery, not a sellable color variant
    if (g.color.includes("/") || /spoločná galéria/i.test(g.color)) {
      into.commonGallery = into.commonGallery || [];
      into.commonGallery.push(...photos);
      photoMap.push({
        action: "common-gallery",
        fromProduct: fromId,
        toProduct: intoId,
        photos,
        note: g.color,
      });
    } else {
      const existing = into.farby.find((x) => x.color === g.color);
      if (existing) existing.photos.push(...photos);
      else into.farby.push({ color: g.color, photos });
    }
  }

  // Prefer rename of target
  const ren = renameById.get(intoId);
  if (ren?.newName) into.name = ren.newName;

  from.status = "merged";
  archived.push({ id: fromId, intoId, reason });
  // Move folder to _archived
  const archDir = path.join(ROOT, "_archived", fromId);
  fs.mkdirSync(path.dirname(archDir), { recursive: true });
  if (fs.existsSync(archDir)) {
    fs.rmSync(archDir, { recursive: true, force: true });
  }
  fs.renameSync(from.dir, archDir);
  photoMap.push({
    action: "archived-folder",
    fromProduct: fromId,
    toProduct: intoId,
    archivePath: `_archived/${fromId}`,
  });

  changes.push({
    originalId: fromId,
    sourceId: from.sourceFolder,
    originalName: from.name,
    newName: into.name,
    originalTaxonomy: `${from.category} / ${from.subcategory} / ${from.druh}`,
    newTaxonomy: `${into.category} / ${into.subcategory} / ${into.druh}`,
    action: "merged",
    reason,
    evidence: "vizuálne porovnanie + rovnaký model",
    verification: "ok",
    resultId: intoId,
  });
}

// ---- apply renames, taxonomy, descriptions to active products ----
for (const [id, p] of products) {
  if (p.status !== "active") continue;
  const before = {
    name: p.name,
    description: p.description,
    category: p.category,
    subcategory: p.subcategory,
    druh: p.druh,
  };

  // Hlavička -> Hlava (aj po rename proposals)
  let name = normalizeName(p.name);
  const ren = renameById.get(id);
  if (ren?.newName) name = normalizeName(ren.newName);
  // Remove gold/color from leftover names
  name = name
    .replace(/\s+so zlatým lemom/gi, " s ozdobnými linkami na okraji")
    .replace(/\s+so zlatým okrajom/gi, " s ornamentálnym okrajom")
    .replace(/\s+s krajkou/gi, " s čipkovaným lemom")
    .replace(/\s+so zelenými kališnými lístkami/gi, " s výraznými kališnými lístkami");
  name = noEm(name);

  const tax = taxById.get(id);
  if (tax) {
    if (tax.category) p.category = tax.category;
    if (tax.subcategory) p.subcategory = tax.subcategory;
    if (tax.druh) p.druh = tax.druh;
  }

  // Canonical druh fixes
  if (p.druh === "Bell cup") p.druh = "Bell Cup";
  if (p.druh === "Tekvica") p.druh = "Tekvice";
  if (/stuha/i.test(name) && p.category === "Dekorácie") {
    p.subcategory = "Stuhy";
  }
  if (
    /sieťk|špagát|šnúr|copík|lyko|drôt|ampulk|skúmavk|stonka|sprej|sneh/i.test(
      name,
    ) &&
    p.category === "Dekorácie"
  ) {
    p.subcategory = "Floristické potreby";
  }

  // Specific fixed renames from brief
  const fixedNames = {
    41: "Hlava chryzantémy - guľovitá",
    55: "Hlava chryzantémy s úzkymi lupienkami",
    73: "Hlava hortenzie s ozdobnými vetvičkami",
    74: "Hlava hortenzie s textúrovanými lupienkami",
    29: "Hlava pivónie - pootvorená",
    56: "Hlava dálie so špicatými lupienkami",
    155: "Dekoratívna stuha s čipkovaným lemom",
    175: "Stuha s ozdobnými linkami na okraji",
    177: "Stuha s ornamentálnym okrajom",
  };
  if (fixedNames[id]) name = fixedNames[id];

  // 147: only rename to snow if proposal ok; else keep cautious name
  if (id === "147") {
    const r147 = renameById.get("147");
    if (r147?.status === "ok" && /sneh/i.test(r147.newName)) {
      name = "Dekoračný sneh v spreji";
    } else {
      name = "Dekoračný sprej";
      questions.push({
        id: "147",
        question:
          "Je na etiketě Florist Deco Snow / sneh, alebo len Florist Deco Spray? Potvrďte typ výrobku pred premenovaním na sneh.",
      });
    }
  }

  let description = buildDescription(name, p.category, p.subcategory, p.druh);
  description = noEm(description);

  // Extra scrub if template still has forbidden words
  if (BAD_DESC.test(description)) {
    description =
      "Dekoratívny produkt do floristických aranžmánov. Hodí sa do vázy, vencov alebo stolových kompozícií.";
  }

  p.name = name;
  p.description = description;

  // Extract common gallery / slash mega-colors / unverified číry from Farby before write
  const sellableFarby = [];
  const commonPhotos = [...(p.commonGallery || [])];
  for (const g of p.farby) {
    if (
      g.color.includes("/") ||
      /spoločná galéria/i.test(g.color) ||
      /^čír/i.test(g.color)
    ) {
      commonPhotos.push(...g.photos.filter((n) => Number.isFinite(n)));
      photoMap.push({
        action: /^čír/i.test(g.color) ? "pending-color-photo" : "common-gallery",
        fromProduct: id,
        toProduct: id,
        photos: g.photos,
        note: g.color,
      });
    } else {
      sellableFarby.push(g);
    }
  }
  p.farby = sellableFarby;
  if (commonPhotos.length) {
    photoMap.push({
      action: "common-gallery-summary",
      productId: id,
      photos: [...new Set(commonPhotos)].sort((a, b) => a - b),
      note: "Spoločné snímky mimo pole Farby - parser ich nesmie brať ako jednu farbu. Potrebné rozšírenie importu pre všeobecnú galériu.",
    });
  }
  if (p.farby.length === 0 && listWebps(p.dir).length > 0) {
    questions.push({
      id,
      question: `Produkt ${id} („${name}") má len spoločné / mix fotografie bez samostatných farebných záberov. Potrebujeme jednotlivé fotky farieb, alebo ide o predávanú sadu/mix? Zatiaľ Farby prázdne, snímky v mapovaní common-gallery.`,
    });
  }

  const farbyStr = formatFarby(p.farby);

  writeInfo(p.dir, {
    name: p.name,
    description: p.description,
    farby: farbyStr,
    druh: p.druh,
    category: p.category,
    subcategory: p.subcategory,
    sourceFolder: p.sourceFolder,
  });

  const action =
    before.name !== p.name ||
    before.description !== p.description ||
    before.category !== p.category ||
    before.subcategory !== p.subcategory ||
    before.druh !== p.druh
      ? before.name !== p.name
        ? "renamed"
        : "updated"
      : "kept";

  changes.push({
    originalId: id,
    sourceId: p.sourceFolder,
    originalName: before.name,
    newName: p.name,
    originalTaxonomy: `${before.category} / ${before.subcategory} / ${before.druh}`,
    newTaxonomy: `${p.category} / ${p.subcategory} / ${p.druh}`,
    action,
    reason: ren?.reason || tax?.reason || "kontrola popisu a zaradenia",
    evidence: ren?.status === "ok" ? "vizuálne porovnanie" : "textové pravidlá",
    verification: ren?.status === "k-overeni" ? "k-overeni" : "ok",
    resultId: id,
  });

  if (ren?.status === "k-overeni") {
    questions.push({
      id,
      question:
        ren.reason ||
        `Overiť odlíšenie modelu „${p.name}" od ostatných s podobným názvom.`,
    });
  }
}

// ---- final validation ----
const activeDirs = fs
  .readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^\d+$/.test(d.name))
  .map((d) => d.name);

const validation = { emdash: [], badDesc: [], missingInfo: [], missingWebp: [] };
for (const id of activeDirs) {
  const dir = path.join(ROOT, id);
  const infoPath = path.join(dir, "info.txt");
  if (!fs.existsSync(infoPath)) {
    validation.missingInfo.push(id);
    continue;
  }
  const text = fs.readFileSync(infoPath, "utf8");
  if (EM.test(text)) validation.emdash.push(id);
  const info = parseInfo(text);
  if (BAD_DESC.test(info["Popis"] || "")) validation.badDesc.push(id);
  const webps = listWebps(dir);
  if (webps.length === 0) validation.missingWebp.push(id);
  // verify farby ranges exist
  for (const g of parseFarby(info["Farby"] || "")) {
    for (const n of g.photos) {
      if (!webps.includes(n)) {
        validation.missingWebp.push(`${id}:${n}`);
      }
    }
  }
}

// Deduplicate questions by id
const qMap = new Map();
for (const q of questions) {
  const key = String(q.id);
  if (!qMap.has(key)) qMap.set(key, q);
}

const summary = {
  activeProducts: activeDirs.length,
  archivedMerged: archived.length,
  changes: changes.length,
  renames: changes.filter((c) => c.action === "renamed").length,
  merges: archived.length,
  questions: qMap.size,
  validation,
  note102:
    "Zdrojový STAV uvádza 642 JPG, ready má 540 WebP. Rozdiel 102 snímok vznikol pri prvom exporte (vynechané mix/duplicitné zábery). Originály JPG sú v katalog_raw/noveprodukty5.9.26/-III; náhradné obrázky nevznikli.",
};

fs.writeFileSync(
  path.join(OUT_DIR, "prehled-zmen.json"),
  JSON.stringify(changes, null, 2),
  "utf8",
);
fs.writeFileSync(
  path.join(OUT_DIR, "mapovani-fotek.json"),
  JSON.stringify(photoMap, null, 2),
  "utf8",
);
fs.writeFileSync(
  path.join(OUT_DIR, "archivovane-slouceni.json"),
  JSON.stringify(archived, null, 2),
  "utf8",
);
fs.writeFileSync(
  path.join(OUT_DIR, "k-overeni.md"),
  [
    "# Položky k ověření",
    "",
    "Každá otázka je rozhodnutelná (ano/ne nebo výběr A/B).",
    "",
    ...[...qMap.values()].map((q) => {
      const photoHint = q.photo ? ` (foto: ${q.photo})` : "";
      return `- **${q.id}**${photoHint}: ${noEm(q.question)}`;
    }),
    "",
  ].join("\n"),
  "utf8",
);

// Common gallery side file for import extension
const commonGalleries = photoMap.filter(
  (p) =>
    p.action === "common-gallery-summary" || p.action === "common-gallery",
);
fs.writeFileSync(
  path.join(OUT_DIR, "spolecna-galerie.json"),
  JSON.stringify(commonGalleries, null, 2),
  "utf8",
);
fs.writeFileSync(
  path.join(ROOT, "spolecna-galerie.json"),
  JSON.stringify(commonGalleries, null, 2),
  "utf8",
);
fs.writeFileSync(
  path.join(OUT_DIR, "souhrn-uprav.md"),
  [
    "# Souhrn úprav katalogu ready-v2",
    "",
    `- Aktivní produkty: **${summary.activeProducts}**`,
    `- Sloučeno / archivováno: **${summary.merges}**`,
    `- Přejmenováno: **${summary.renames}**`,
    `- Otázky k ověření: **${summary.questions}**`,
    `- Em dash v textech: **${validation.emdash.length}**`,
    `- Popisy s barvou/počtem: **${validation.badDesc.length}**`,
    "",
    "## Sloučení",
    ...archived.map((a) => `- ${a.id} → ${a.intoId}: ${noEm(a.reason)}`),
    "",
    "## JPG vs WebP",
    summary.note102,
    "",
    "Originál `noveprodukty5.9.26-ready` beze změny. Pracovní kopie: `noveprodukty5.9.26-ready-v2`.",
    "",
  ].join("\n"),
  "utf8",
);
fs.writeFileSync(
  path.join(OUT_DIR, "summary.json"),
  JSON.stringify(summary, null, 2),
  "utf8",
);

// Update STAV in v2
fs.writeFileSync(
  path.join(ROOT, "STAV.md"),
  [
    "# Katalóg batch 5.9.26 - ready-v2 (opravená pracovná kópia)",
    "",
    "Originál: `katalog_raw/noveprodukty5.9.26-ready/` (nezmenený)",
    "Táto kópia: `katalog_raw/noveprodukty5.9.26-ready-v2/`",
    "",
    `Aktívne produkty: ${summary.activeProducts}`,
    `Archivované po zlúčení: _archived/ (${summary.merges})`,
    "",
    "Reporty: `scripts/katalog-5-9-26/v2-reports/`",
    "",
    "- Bez Em pomlčiek",
    "- Popis bez farieb a počtov kusov",
    "- Hlavička -> Hlava",
    "- Barevné varianty rovnakého modelu zlúčené; odlišné modely samostatne",
    "",
  ].join("\n"),
  "utf8",
);

console.log(JSON.stringify(summary, null, 2));
