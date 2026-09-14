/**
 * Build corrected catalog ready-v3 from original ready.
 * Keeps only evidence-backed merges; restores name-only merges as separate products.
 * Does not modify ready or ready-v2.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("katalog_raw/noveprodukty5.9.26-ready-v3");
const READY = path.resolve("katalog_raw/noveprodukty5.9.26-ready");
const OUT = path.resolve("scripts/katalog-5-9-26/v3-reports");
const FLOWERS = JSON.parse(
  fs.readFileSync("scripts/katalog-5-9-26/rename-proposals-flowers.json", "utf8"),
);
const DEKOR = JSON.parse(
  fs.readFileSync("scripts/katalog-5-9-26/rename-proposals-dekor.json", "utf8"),
);

fs.mkdirSync(OUT, { recursive: true });

const EM = /[\u2013\u2014\u2015\u2212]/g;
const BAD_DESC =
  /(biela|biel[aéy]|červen|ružov|fialov|zelen[aáey]|krémov|oranž|žlt|modr|hned|siv[aáey]|vínov|bordov|staroruž|losos|čier|marhuľ|hrdzav|zlat|čír|tmav[aáoý]|svetl[aáoý]|päť|štyri|šesť|sedem|osem|deväť|desať|\d+\s*ks|balenie po|\bstoniek\b|\bkvetov\b|\bhláv\b|\bkusov\b|niekoľko|rôznych farb|farebn[éeý]|varianty)/i;

function noEm(s) {
  return String(s || "")
    .replace(EM, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeName(name) {
  return noEm(name)
    .replace(/Hlavička/gu, "Hlava")
    .replace(/hlavička/gu, "hlava")
    .replace(/Hlavičky/gu, "Hlavy")
    .replace(/hlavičky/gu, "hlavy");
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

/** Prefer contiguous ranges; never emit comma lists. */
function formatFarby(groups) {
  return groups
    .map((g) => {
      const nums = [...new Set(g.photos.filter(Number.isFinite))].sort(
        (a, b) => a - b,
      );
      if (nums.length === 0) return null;
      if (nums.length === 1) return `${g.color} [${nums[0]}]`;
      let contiguous = true;
      for (let i = 1; i < nums.length; i++) {
        if (nums[i] !== nums[i - 1] + 1) contiguous = false;
      }
      if (contiguous) return `${g.color} [${nums[0]}-${nums[nums.length - 1]}]`;
      // Split non-contiguous into singles/ranges chunks
      const parts = [];
      let start = nums[0];
      let prev = nums[0];
      for (let i = 1; i <= nums.length; i++) {
        const n = nums[i];
        if (n !== prev + 1) {
          parts.push(
            start === prev ? `${g.color} [${start}]` : `${g.color} [${start}-${prev}]`,
          );
          start = n;
        }
        prev = n;
      }
      return parts.join(" | ");
    })
    .filter(Boolean)
    .join(" | ");
}

function writeInfo(dir, fields) {
  const lines = [
    `Názov: ${noEm(fields.name)}`,
    `Popis: ${noEm(fields.description)}`,
    `Farby: ${fields.farby || ""}`,
    `Druh: ${noEm(fields.druh)}`,
    `Kategória: ${noEm(fields.category)}`,
    `Subkategória: ${noEm(fields.subcategory)}`,
    `Zdrojová zložka: ${fields.sourceFolder}`,
  ];
  fs.writeFileSync(path.join(dir, "info.txt"), lines.join("\n") + "\n", "utf8");
}

function listWebps(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".webp"))
    .map((f) => Number(f.replace(".webp", "")))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
}

function clearWebps(dir) {
  for (const n of listWebps(dir)) {
    fs.unlinkSync(path.join(dir, `${n}.webp`));
  }
}

function copyWebp(src, destDir, destIndex) {
  fs.copyFileSync(src, path.join(destDir, `${destIndex}.webp`));
}

/** Rebuild product photos ordered by color groups -> contiguous ranges. */
function rebuildByColors(dir, colorGroups, photoMap, productId) {
  const staging = [];
  for (const g of colorGroups) {
    for (const oldIdx of g.photos) {
      const src = path.join(dir, `${oldIdx}.webp`);
      if (!fs.existsSync(src)) continue;
      staging.push({ color: g.color, src, oldIdx });
    }
  }
  // Also keep any orphan webps not in farby as common? skip - handled separately
  clearWebps(dir);
  const newGroups = [];
  let next = 1;
  let currentColor = null;
  let currentPhotos = [];
  for (const item of staging) {
    if (currentColor !== item.color) {
      if (currentColor && currentPhotos.length) {
        newGroups.push({ color: currentColor, photos: currentPhotos });
      }
      currentColor = item.color;
      currentPhotos = [];
    }
    copyWebp(item.src, dir, next);
    photoMap.push({
      action: "reordered",
      productId,
      fromFile: `${item.oldIdx}.webp`,
      toFile: `${next}.webp`,
      color: item.color,
    });
    currentPhotos.push(next);
    next += 1;
  }
  if (currentColor && currentPhotos.length) {
    newGroups.push({ color: currentColor, photos: currentPhotos });
  }
  return newGroups;
}

function buildDescription(name, category, subcategory, druh) {
  const n = name.toLowerCase();

  // Explicit product descriptions
  const exact = {
    "hlava chryzantémy - guľovitá":
      "Dekoratívna hlava chryzantémy s guľovitým tvarom a husto usporiadanými lupienkami. Hodí sa na tvorbu vencov a kvetinových aranžmánov.",
    "hlava chryzantémy s úzkymi lupienkami":
      "Dekoratívna hlava chryzantémy s dlhými úzkymi lupienkami a otvoreným tvarom. Vynikne vo vencoch a výrazných kvetinových dekoráciách.",
    "hlava hortenzie s ozdobnými vetvičkami":
      "Dekoratívna hlava hortenzie doplnená ozdobnými vetvičkami. Hodí sa do vencov a floristických aranžmánov.",
    "hlava hortenzie s textúrovanými lupienkami":
      "Dekoratívna hlava hortenzie s textúrovanými lupienkami. Hodí sa do vencov a kvetinových aranžmánov.",
    "hlava hortenzie s hustým riaseným trsom":
      "Dekoratívna hlava hortenzie z hustého trsu drobných riasených kvetov. Hodí sa do vencov a objemných aranžmánov.",
    "hlava dálie - guľovitá":
      "Dekoratívna hlava dálie s guľovitým tvarom a okrúhlymi, dovnútra zahnutými lupienkami. Hodí sa na výrobu vencov a bohatých aranžmánov.",
    "hlava dálie so špicatými lupienkami":
      "Dekoratívna hlava dálie so špicatými vrstvenými lupienkami. Hodí sa do vencov a výrazných kvetinových dekorácií.",
    "hlava dálie s úzkymi špicatými lupienkami":
      "Dekoratívna hlava dálie s úzkymi špicatými lupienkami. Hodí sa do vencov a floristických aranžmánov.",
    "hlava dálie s viditeľným stredom":
      "Dekoratívna hlava dálie so špicatými lupienkami a otvoreným stredom. Hodí sa do vencov a aranžmánov.",
    "hlava pivónie - pootvorená":
      "Dekoratívna hlava pivónie v pootvorenom pohárovom tvare. Hodí sa na výrobu vencov a floristických aranžmánov.",
    "dekoratívna stuha s čipkovaným lemom":
      "Dekoratívna stuha s kvetinovým vzorom a čipkovaným lemom. Hodí sa na zdobenie kytíc, darčekových balení a dekorácií.",
    "stuha s ozdobnými linkami na okraji":
      "Dekoratívna stuha s ozdobnými linkami na okraji. Hodí sa na viazanie kytíc a darčekové balenia.",
    "stuha s ornamentálnym okrajom":
      "Dekoratívna stuha s ornamentálnym okrajom. Hodí sa na balenie darčekov a floristické aranžmány.",
    "floristický drôt":
      "Tenký floristický drôt na upevnenie a tvarovanie pri aranžovaní. Uľahčuje viazanie kytíc a stavbu vencov.",
    "dekoračný sprej":
      "Dekoračný sprej Florist Deco Spray na úpravu sušených aj umelých dekorácií a doplnkov. Hodí sa na dokončenie floristických aranžmánov.",
    "umelé lýko":
      "Umelé lýko (rafia) na viazanie a balenie. Hodí sa na kytice, darčekové balenia a floristické väzby.",
    "umelá rafia":
      "Umelé lýko (rafia) na viazanie a balenie. Hodí sa na kytice, darčekové balenia a floristické väzby.",
    "jednoliatá drevená ružička":
      "Dekoratívna drevená ružička s jednoliatym povrchom a vrstvenými lupienkami. Hodí sa na lepenie do vencov a prírodných aranžmánov.",
    "dvojfarebná drevená ružička":
      "Dekoratívna drevená ružička s kontrastným jadrom a okrajom lupienkov. Hodí sa do vencov a rustikálnych aranžmánov.",
    "cédrová ruža":
      "Prírodná dekorácia v tvare ruže zo šupiniek šišky. Hodí sa na lepenie do vencov a sezónnych aranžmánov.",
    "cédrová ružička":
      "Prírodná dekorácia v tvare ruže zo šupiniek šišky. Hodí sa na lepenie do vencov a sezónnych aranžmánov.",
    "drevená hlava kvetu":
      "Spirálovito vrstvená drevená hlava kvetu. Hodí sa na lepenie do vencov a prírodných dekorácií.",
    "predĺžené drevené špirálky":
      "Predĺžené dekoračné špirálky z tenkých drevených pásikov. Hodí sa do vencov, mís a suchých väzieb.",
    "ploché drevené špirálky":
      "Ploché kotúčovité drevené špirálky. Hodí sa do vencov a rustikálnych aranžmánov.",
    "saténová stuha s kvetinovým vzorom":
      "Saténová stuha s kvetinovým vzorom. Hodí sa na balenie darčekov a zdobenie kytíc.",
    "ampulky na kvety":
      "Floristické ampulky na vodu pre stonky v aranžmánoch. Udržia čerstvé kvety vo vencoch a väzbách.",
    "ampulky na vodu":
      "Floristické ampulky na vodu pre stonky v aranžmánoch. Udržia čerstvé kvety vo vencoch a väzbách.",
    "floristická skúmavka":
      "Floristická skúmavka na vodu so zápichom. Hodí sa do vencov a aranžmánov s čerstvými stonkami.",
  };
  if (exact[n]) return exact[n];

  if (n.includes("stuha") || n.includes("páska")) {
    if (n.includes("károvan")) {
      return "Dekoratívna stuha s károvaným vzorom. Hodí sa na balenie darčekov a rustikálne aranžmány.";
    }
    if (n.includes("textúr")) {
      return "Dekoratívna stuha s textúrovaným povrchom. Hodí sa na viazanie kytíc a darčekové balenia.";
    }
    if (n.includes("jut")) {
      return "Dekoratívna jutová páska. Hodí sa na rustikálne viazanie kytíc a balenie.";
    }
    if (n.includes("margarét")) {
      return "Dekoratívna stuha s margarétkovým vzorom. Hodí sa na zdobenie kytíc a darčekov.";
    }
    if (n.includes("satén")) {
      return "Saténová stuha s hladkým povrchom. Hodí sa na viazanie kytíc a darčekové balenia.";
    }
    return "Dekoratívna stuha vhodná na viazanie kytíc a darčekové balenia. Jednoduchý doplnok pre floristiku.";
  }

  if (n.includes("špagát") || n.includes("šnúr") || n.includes("copík") || n.includes("lyko") || n.includes("rafia")) {
    return "Viazací materiál na floristiku a balenie. Hodí sa na preväzovanie kytíc a dekorácií.";
  }
  if (n.includes("sieťk")) {
    return "Dekoračná sieťka na balenie a aranžovanie. Hodí sa do kytíc a darčekových balení.";
  }
  if (n.includes("stonka")) {
    return "Plastová stonka ako základ pre umelé kvety. Hodí sa na zostavenie aranžmánov.";
  }
  if (n.startsWith("kytica")) {
    return "Umelá kytica pripravená do vázy. Hodí sa ako hotová stolová dekorácia.";
  }

  if (n.startsWith("hlava ")) {
    if (n.includes(" - guľovit")) {
      const kind = name.split(" - ")[0];
      return `Dekoratívna ${kind.toLowerCase()} s guľovitým tvarom. Hodí sa na výrobu vencov a floristických aranžmánov.`;
    }
    if (n.includes(" - ")) {
      const feature = name.split(" - ").slice(1).join(" - ");
      const kind = name.split(" - ")[0];
      return `Dekoratívna ${kind.toLowerCase()} (${feature}). Hodí sa na výrobu vencov a floristických aranžmánov.`;
    }
    const soIdx = name.toLowerCase().search(/ s[o]? /);
    if (soIdx > 0) {
      const kind = name.slice(0, soIdx);
      const feature = name.slice(soIdx + 1); // includes "s ..." or "so ..."
      return `Dekoratívna ${kind.toLowerCase()} ${feature.toLowerCase()}. Hodí sa na výrobu vencov a floristických aranžmánov.`;
    }
    return `Dekoratívna ${name.toLowerCase()} určená na výrobu vencov a aranžmánov. Komponent bez stonky.`;
  }

  if (n.includes("na stopke") || subcategory === "Stopkové kvety") {
    return `Dekoratívny ${name.toLowerCase()} vhodný do vázy alebo aranžmánu. Jednoduchý doplnok bez nutnosti údržby.`;
  }

  if (subcategory === "Prírodniny") {
    return `Dekoratívny prírodný prvok (${name.toLowerCase()}). Hodí sa do vencov, mís a sezónnych aranžmánov.`;
  }

  return `Dekoratívny produkt (${name.toLowerCase()}). Hodí sa do vázy, vencov alebo stolových kompozícií.`;
}

// ---- renames / taxonomy maps ----
const renameById = new Map();
for (const r of [...FLOWERS.renames, ...DEKOR.renames]) {
  renameById.set(String(r.id), r);
}
const taxById = new Map();
for (const t of DEKOR.taxonomy || []) {
  taxById.set(String(t.id), t);
}

// Extra name overrides for v3
const fixedNames = {
  41: "Hlava chryzantémy - guľovitá",
  55: "Hlava chryzantémy s úzkymi lupienkami",
  73: "Hlava hortenzie s ozdobnými vetvičkami",
  74: "Hlava hortenzie s textúrovanými lupienkami",
  17: "Hlava hortenzie s hustým riaseným trsom",
  18: "Hlava hortenzie s hustým riaseným trsom",
  26: "Hlava hortenzie s hustým riaseným trsom",
  29: "Hlava pivónie - pootvorená",
  56: "Hlava dálie so špicatými lupienkami",
  66: "Hlava dálie - guľovitá",
  84: "Jednoliatá drevená ružička",
  144: "Cédrová ruža",
  147: "Dekoračný sprej",
  155: "Dekoratívna stuha s čipkovaným lemom",
  167: "Umelé lýko",
  175: "Stuha s ozdobnými linkami na okraji",
  177: "Stuha s ornamentálnym okrajom",
  61: "Hlava ruže s výraznými kališnými lístkami",
  57: "Hlava iskerníka - kompaktná",
  77: "Lotosový plod s matným povrchom",
  82: "Hlava kvetu s kontrastným stredom",
  127: "Predĺžené drevené špirálky",
  83: "Dvojfarebná drevená ružička",
  85: "Drevená hlava kvetu",
};

// Evidence-backed merges only (no name-only merges)
const CONFIRMED_MERGES = [
  {
    fromIds: ["68"],
    intoId: "66",
    mode: "common-gallery",
    reason:
      "Fotky 68 ukazujú farebný mix guľovitej dálie s okrúhlymi lupienkami; jednotlivé kusy sa zhodujú s farebnými variantmi 66. Ide o prezentačný mix, nie samostatný predávaný model.",
    evidence: "porovnanie stavby hlavy 66 vs mix 68 (okrúhle lupienky, rovnaký stred); nie spoločný AI názov",
  },
  {
    fromIds: ["162"],
    intoId: "156",
    mode: "colors",
    reason:
      "Rovnaký kvetinový potlačový vzor a rovnaký typ saténovej stuhy; líšia sa len farbou podkladu. Šírka/návin z fotky neodhadované - zlúčené ako farebné varianty vzoru.",
    evidence: "vizuálna zhoda kvetinového vzoru na 156 a 162",
  },
  {
    fromIds: ["180"],
    intoId: "127",
    mode: "colors",
    reason:
      "Rovnaké predĺžené drevené špirálky (tyčinkovitý tvar); rozdiel len farba. Rozmer z fotky neodhadovaný.",
    evidence: "zhoda predĺženého tvaru špirálok 127 a 180",
  },
  {
    fromIds: ["116"],
    intoId: "83",
    mode: "colors",
    reason:
      "Rovnaká dvojfarebná drevená ružička (svetlejšie jadro, tmavší okraj); 116 je ďalšia farebná/prírodná prezentácia.",
    evidence: "zhoda dvojfarebnej stavby lupienkov 83 a 116",
  },
  {
    fromIds: ["87", "97"],
    intoId: "85",
    mode: "colors",
    reason:
      "Rovnaká spirálovitá drevená hlava kvetu; 87 a 97 pridávajú ďalšie farby/prezentácie (mach, sáčok). Predajná jednotka zo zdroja neoverená, tvar výrobku je totožný.",
    evidence: "zhoda spirálovitej vrstvenej stavby 85/87/97",
  },
  {
    fromIds: ["16"],
    intoId: "15",
    mode: "colors",
    reason:
      "Rovnaká veľká otvorená hlava iskerníka s hustými vrstvami lupienkov; rozdiel len farba.",
    evidence: "zhoda veľkosti a vrstvenia 15 a 16; kontrast voči kompaktnej 57",
  },
];

const RESTORED_MERGES = [
  { id: "14", wasInto: "13", reason: "Zlúčenie vo v2 len podľa spoločného AI názvu; totožnosť modelu a balenia nepotvrdená." },
  { id: "32", wasInto: "28", reason: "Zlúčenie vo v2 len podľa spoločného AI názvu; totožnosť modelu a balenia nepotvrdená." },
  { id: "35", wasInto: "34", reason: "Vo v2 označené ok aj k-overeni naraz; bez potvrdenia SKU/balenia vrátené samostatne." },
  { id: "38", wasInto: "36", reason: "Zlúčenie vo v2 len podľa spoločného AI názvu; totožnosť modelu a balenia nepotvrdená." },
  { id: "46", wasInto: "43", reason: "Vo v2 označené ok aj k-overeni naraz; bez potvrdenia, či 46 je len balené foto 43, vrátené samostatne." },
  { id: "70", wasInto: "67", reason: "Vo v2 označené ok aj k-overeni naraz; bez potvrdenia SKU/balenia vrátené samostatne." },
];

const photoMap = [];
const changes = [];
const questions = [];
const archived = [];
const commonGallery = [];
const importNotes = [];

// Load all products from v3 (copy of ready)
const products = new Map();
for (const ent of fs.readdirSync(ROOT, { withFileTypes: true })) {
  if (!ent.isDirectory() || !/^\d+$/.test(ent.name)) continue;
  const dir = path.join(ROOT, ent.name);
  const info = parseInfo(fs.readFileSync(path.join(dir, "info.txt"), "utf8"));
  const farby = parseFarby(info["Farby"] || "");
  // Split slash mega-colors out immediately
  const sellable = [];
  const common = [];
  for (const g of farby) {
    if (g.color.includes("/") || /^čír/i.test(g.color)) {
      common.push(...g.photos);
    } else {
      sellable.push(g);
    }
  }
  products.set(ent.name, {
    id: ent.name,
    dir,
    name: info["Názov"],
    description: info["Popis"],
    farby: sellable,
    commonPhotos: common,
    druh: info["Druh"],
    category: info["Kategória"],
    subcategory: info["Subkategória"],
    sourceFolder: info["Zdrojová zložka"],
    status: "active",
  });
}

function performColorMerge(fromId, intoId, reason, evidence) {
  const from = products.get(fromId);
  const into = products.get(intoId);
  if (!from || !into) throw new Error(`Missing ${fromId} or ${intoId}`);

  // Stage bytes first - clearing into.dir would delete sources still referenced
  const combined = [];
  for (const g of into.farby) {
    combined.push({
      color: g.color,
      buffers: g.photos.map((n) => {
        const src = path.join(into.dir, `${n}.webp`);
        return {
          buf: fs.readFileSync(src),
          fromProduct: intoId,
          fromFile: `${n}.webp`,
        };
      }),
    });
  }
  for (const g of from.farby) {
    if (g.color.includes("/")) continue;
    const buffers = g.photos.map((n) => {
      const src = path.join(from.dir, `${n}.webp`);
      return {
        buf: fs.readFileSync(src),
        fromProduct: fromId,
        fromFile: `${n}.webp`,
      };
    });
    const existing = combined.find((x) => x.color === g.color);
    if (existing) existing.buffers.push(...buffers);
    else combined.push({ color: g.color, buffers });
  }

  clearWebps(into.dir);
  const newFarby = [];
  let next = 1;
  for (const g of combined) {
    const photos = [];
    for (const item of g.buffers) {
      fs.writeFileSync(path.join(into.dir, `${next}.webp`), item.buf);
      photoMap.push({
        action: "merged-photo",
        fromProduct: item.fromProduct,
        fromFile: item.fromFile,
        toProduct: intoId,
        toFile: `${next}.webp`,
        color: g.color,
      });
      photos.push(next);
      next += 1;
    }
    if (photos.length) newFarby.push({ color: g.color, photos });
  }
  into.farby = newFarby;

  from.status = "merged";
  archived.push({ id: fromId, intoId, reason, evidence, verification: "ok" });
  const archDir = path.join(ROOT, "_archived", fromId);
  fs.mkdirSync(path.dirname(archDir), { recursive: true });
  if (fs.existsSync(archDir)) fs.rmSync(archDir, { recursive: true, force: true });
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
    evidence,
    verification: "ok",
    resultId: intoId,
  });
}

function performGalleryMerge(fromId, intoId, reason, evidence) {
  const from = products.get(fromId);
  const into = products.get(intoId);
  if (!from || !into) throw new Error(`Missing ${fromId} or ${intoId}`);

  let next = Math.max(0, ...listWebps(into.dir)) + 1;
  const galleryPhotos = [];
  for (const n of listWebps(from.dir)) {
    copyWebp(path.join(from.dir, `${n}.webp`), into.dir, next);
    photoMap.push({
      action: "common-gallery",
      fromProduct: fromId,
      toProduct: intoId,
      fromFile: `${n}.webp`,
      toFile: `${next}.webp`,
    });
    galleryPhotos.push(next);
    next += 1;
  }
  into.commonPhotos = [...(into.commonPhotos || []), ...galleryPhotos];
  commonGallery.push({
    productId: intoId,
    photos: galleryPhotos,
    fromProduct: fromId,
    note: "Prezentačný mix / spoločná galéria - nie farebná varianta v poli Farby.",
  });

  from.status = "merged";
  archived.push({ id: fromId, intoId, reason, evidence, verification: "ok" });
  const archDir = path.join(ROOT, "_archived", fromId);
  fs.mkdirSync(path.dirname(archDir), { recursive: true });
  if (fs.existsSync(archDir)) fs.rmSync(archDir, { recursive: true, force: true });
  fs.renameSync(from.dir, archDir);
  changes.push({
    originalId: fromId,
    sourceId: from.sourceFolder,
    originalName: from.name,
    newName: into.name,
    originalTaxonomy: `${from.category} / ${from.subcategory} / ${from.druh}`,
    newTaxonomy: `${into.category} / ${into.subcategory} / ${into.druh}`,
    action: "merged",
    reason,
    evidence,
    verification: "ok",
    resultId: intoId,
  });
}

// Execute confirmed merges
for (const m of CONFIRMED_MERGES) {
  for (const fromId of m.fromIds) {
    if (m.mode === "common-gallery") {
      performGalleryMerge(fromId, m.intoId, m.reason, m.evidence);
    } else {
      performColorMerge(fromId, m.intoId, m.reason, m.evidence);
    }
  }
}

// Record restored (never merged in v3) - products already separate from ready
for (const r of RESTORED_MERGES) {
  const p = products.get(r.id);
  changes.push({
    originalId: r.id,
    sourceId: p?.sourceFolder,
    originalName: p?.name,
    newName: p?.name,
    originalTaxonomy: p ? `${p.category} / ${p.subcategory} / ${p.druh}` : "",
    newTaxonomy: p ? `${p.category} / ${p.subcategory} / ${p.druh}` : "",
    action: "restored-separate",
    reason: r.reason,
    evidence: `Vo v2 bolo zlúčené do ${r.wasInto}; vo v3 obnovené zo zdrojového ready.`,
    verification: "k-overeni",
    resultId: r.id,
  });
  questions.push({
    id: `${r.id}->${r.wasInto}`,
    photo: `${r.id}/1.webp a ${r.wasInto}/1.webp`,
    question: r.reason + " Potvrďte, či ide o ten istý model a rovnakú predajnú jednotku.",
  });
}

// Apply renames, taxonomy, descriptions to active products
for (const [id, p] of products) {
  if (p.status !== "active") continue;
  const before = {
    name: p.name,
    description: p.description,
    category: p.category,
    subcategory: p.subcategory,
    druh: p.druh,
  };

  let name = normalizeName(p.name);
  const ren = renameById.get(id);
  if (ren?.newName) name = normalizeName(ren.newName);
  if (fixedNames[id]) name = fixedNames[id];

  name = name
    .replace(/\s+so zlatým lemom/gi, " s ozdobnými linkami na okraji")
    .replace(/\s+so zlatým okrajom/gi, " s ornamentálnym okrajom")
    .replace(/\s+s krajkou/gi, " s čipkovaným lemom")
    .replace(/\s+so zelenými kališnými lístkami/gi, " s výraznými kališnými lístkami")
    .replace(/^Jednofarebná svetlá drevená ružička$/i, "Jednoliatá drevená ružička")
    .replace(/^Jednofarebná tmavá drevená ružička$/i, "Cédrová ruža");
  name = noEm(name);

  const tax = taxById.get(id);
  if (tax) {
    if (tax.category) p.category = tax.category;
    if (tax.subcategory) p.subcategory = tax.subcategory;
    if (tax.druh) p.druh = tax.druh;
  }

  // Canonical fixes
  if (p.druh === "Bell cup") p.druh = "Bell Cup";
  if (p.druh === "Tekvica") p.druh = "Tekvice";

  // 167: label says umelá rafia - fix name+druh together
  if (id === "167") {
    name = "Umelé lýko";
    p.druh = "Umelé lýko";
    p.subcategory = "Floristické potreby";
    p.category = "Dekorácie";
  }

  // 144: cedar rose, not wooden light/dark variant of 84
  if (id === "144") {
    name = "Cédrová ruža";
    p.druh = "Cédrová ruža";
    p.category = "Dekorácie";
    p.subcategory = "Prírodniny";
    questions.push({
      id: "144",
      photo: "144/1.webp",
      question:
        "Potvrďte, že 144 je cédrová ruža (šiška), nie drevená sola ružička ako 84. Majú sa zaradiť k 96/99/143?",
    });
  }

  if (id === "84") {
    name = "Jednoliatá drevená ružička";
    questions.push({
      id: "84",
      photo: "84/1.webp oproti 83/1.webp",
      question:
        "Je 84 konštrukčne iná (jednoliatá) než dvojfarebná 83, alebo len iná farba? So 144 neslučovať - 144 vyzerá ako cédrová šiška.",
    });
  }

  // Ribbon / florist subcategory from name
  if (/stuha|páska/i.test(name) && p.category === "Dekorácie") {
    if (!/Floristické/i.test(p.subcategory) || /stuha/i.test(name)) {
      p.subcategory = "Stuhy";
    }
  }
  if (
    /sieťk|špagát|šnúr|copík|lyko|rafia|drôt|ampulk|skúmavk|stonka|sprej/i.test(name) &&
    p.category === "Dekorácie"
  ) {
    p.subcategory = "Floristické potreby";
  }

  // 147: keep spray, no číry color, no snow
  if (id === "147") {
    name = "Dekoračný sprej";
    p.farby = [];
    p.commonPhotos = listWebps(p.dir);
    importNotes.push({
      productId: "147",
      issue: "empty-farby",
      note: "Farby prázdne zámerne - priesvitný uzáver nepotvrdzuje farbu obsahu. Foto 1.webp ostáva pri produkte. Importér musí podporiť produkt bez farebnej varianty alebo dočasný stav 'bez farby'.",
    });
    questions.push({
      id: "147",
      photo: "147/1.webp",
      question:
        "Akú farebnú/efektovú variantu spreja Florist Deco Spray skladujete (ak je na etiketě uvedené)? Priesvitný uzáver neberieme ako dôkaz čírej farby.",
    });
  }

  // 155 / 172 common gallery only
  if (id === "155" || id === "172") {
    const photos = listWebps(p.dir);
    p.farby = [];
    p.commonPhotos = photos;
    commonGallery.push({
      productId: id,
      photos,
      note: "Len spoločné/mix fotografie - nie jednotlivé farebné varianty. Nepripravené na bezchybný farebný import.",
    });
    importNotes.push({
      productId: id,
      issue: "common-gallery-only",
      note: "Pole Farby prázdne; snímky v spoločnej galérii. Potrebné jednotlivé fotky farieb alebo potvrdenie, že ide o predávanú sadu. Importér potrebuje podporu všeobecnej galérie.",
    });
    questions.push({
      id,
      photo: `${id}/1.webp`,
      question:
        id === "155"
          ? "Sú na fotkách 155 samostatne predávané farby stuhy, alebo sada/mix? Potrebujeme jednotlivé fotky farieb."
          : "Je 172 sada kotúčov papierového lyka, alebo jednotlivé farby? Potrebujeme fotky jednotlivých kotúčov.",
    });
  }

  let description = buildDescription(name, p.category, p.subcategory, p.druh);
  description = noEm(description);
  if (BAD_DESC.test(description)) {
    // scrub once more with safer fallback tied to name
    description = noEm(
      `${name} do floristických aranžmánov. Hodí sa do vencov, väzieb a stolových dekorácií.`,
    );
    if (BAD_DESC.test(description)) {
      description =
        "Dekoratívny floristický produkt. Hodí sa do vencov, väzieb a stolových dekorácií.";
    }
  }

  p.name = name;
  p.description = description;

  // Reorder photos for contiguous ranges when needed (esp. after merges)
  if (p.farby.length && p.farby.some((g) => {
    const nums = [...g.photos].sort((a, b) => a - b);
    for (let i = 1; i < nums.length; i++) {
      if (nums[i] !== nums[i - 1] + 1) return true;
    }
    return false;
  })) {
    // rebuild from current files - already contiguous if from merge rebuild
  }

  // For merged targets, photos already ordered. For others keep as-is if contiguous format works.
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

  if (p.commonPhotos?.length) {
    commonGallery.push({
      productId: id,
      photos: [...new Set(p.commonPhotos)].sort((a, b) => a - b),
      note: "Spoločná galéria mimo Farby",
    });
  }

  const renamed = before.name !== p.name;
  const updated =
    before.description !== p.description ||
    before.category !== p.category ||
    before.subcategory !== p.subcategory ||
    before.druh !== p.druh;

  changes.push({
    originalId: id,
    sourceId: p.sourceFolder,
    originalName: before.name,
    newName: p.name,
    originalTaxonomy: `${before.category} / ${before.subcategory} / ${before.druh}`,
    newTaxonomy: `${p.category} / ${p.subcategory} / ${p.druh}`,
    action: renamed ? "renamed" : updated ? "updated" : "kept",
    reason: ren?.reason || tax?.reason || "kontrola popisu a zaradenia (v3)",
    evidence: ren?.status === "ok" ? "vizuálne porovnanie + návrh v2" : "textové/taxonomické pravidlá v3",
    verification: ren?.status === "k-overeni" ? "k-overeni" : "ok",
    resultId: id,
  });

  if (ren?.status === "k-overeni") {
    questions.push({
      id,
      photo: `${id}/1.webp`,
      question:
        ren.reason ||
        `Overiť odlíšenie „${p.name}" od podobných položiek.`,
    });
  }
}

// Collision questions for identical working names
const nameIndex = new Map();
for (const [id, p] of products) {
  if (p.status !== "active") continue;
  if (!nameIndex.has(p.name)) nameIndex.set(p.name, []);
  nameIndex.get(p.name).push(id);
}
for (const [name, ids] of nameIndex) {
  if (ids.length < 2) continue;
  if (
    name === "Hlava ruže" ||
    name === "Hlava hortenzie" ||
    name === "Saténová stuha"
  ) {
    questions.push({
      id: `kolizia:${ids.join(",")}`,
      photo: ids.map((i) => `${i}/1.webp`).join(", "),
      question: `Produkty ${ids.join(", ")} majú rovnaký pracovný názov „${name}". Označte spoľahlivý rozlišujúci znak alebo potvrďte, ktoré sú farebné varianty jedného modelu (vrátane šírky/balenia u stúh).`,
    });
  }
}

// Deduplicate questions
const qMap = new Map();
for (const q of questions) {
  const key = String(q.id);
  if (!qMap.has(key)) qMap.set(key, q);
}

// Validation
const activeDirs = fs
  .readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^\d+$/.test(d.name))
  .map((d) => d.name)
  .sort((a, b) => Number(a) - Number(b));

const validation = {
  emdash: [],
  badDesc: [],
  missingInfo: [],
  missingWebp: [],
  commaFarby: [],
  genericDesc: {},
};
const descCounts = new Map();

let totalWebpActive = 0;
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
  const desc = info["Popis"] || "";
  if (BAD_DESC.test(desc)) validation.badDesc.push(id);
  descCounts.set(desc, (descCounts.get(desc) || 0) + 1);
  if (/\[\d+,\d+/.test(info["Farby"] || "")) validation.commaFarby.push(id);
  const webps = listWebps(dir);
  totalWebpActive += webps.length;
  for (const g of parseFarby(info["Farby"] || "")) {
    for (const n of g.photos) {
      if (!webps.includes(n)) validation.missingWebp.push(`${id}:${n}`);
    }
  }
}

let totalWebpArchived = 0;
const archRoot = path.join(ROOT, "_archived");
if (fs.existsSync(archRoot)) {
  for (const id of fs.readdirSync(archRoot)) {
    totalWebpArchived += listWebps(path.join(archRoot, id)).length;
  }
}

for (const [desc, count] of descCounts) {
  if (count >= 5) validation.genericDesc[desc] = count;
}

const renamedCount = changes.filter((c) => c.action === "renamed").length;
const restoredCount = changes.filter((c) => c.action === "restored-separate").length;
const mergedCount = archived.length;

const summary = {
  comparedTo: "katalog_raw/noveprodukty5.9.26-ready (originál) + korekcie voči chybám v2",
  activeProducts: activeDirs.length,
  archivedMerged: mergedCount,
  restoredSeparate: restoredCount,
  renames: renamedCount,
  questions: qMap.size,
  webpActive: totalWebpActive,
  webpArchivedOriginals: totalWebpArchived,
  expectedWebpActive: 540,
  validation,
  jpgVsWebp:
    "Zdrojový STAV uvádza 642 JPG, ready má 540 WebP. Konkrétny zoznam 102 vynechaných snímok tu nie je priložený; vysvetlenie (mix/duplicitné zábery pri exporte) je NEOVERENÉ bez inventúry zdrojových JPG.",
};

fs.writeFileSync(path.join(OUT, "prehled-zmen.json"), JSON.stringify(changes, null, 2));
fs.writeFileSync(path.join(OUT, "mapovani-fotek.json"), JSON.stringify(photoMap, null, 2));
fs.writeFileSync(path.join(OUT, "archivovane-slouceni.json"), JSON.stringify(archived, null, 2));
fs.writeFileSync(path.join(OUT, "obnovene-produkty.json"), JSON.stringify(RESTORED_MERGES, null, 2));
fs.writeFileSync(path.join(OUT, "spolecna-galerie.json"), JSON.stringify(commonGallery, null, 2));
fs.writeFileSync(path.join(OUT, "import-poznamky.json"), JSON.stringify(importNotes, null, 2));
fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify(summary, null, 2));

fs.writeFileSync(
  path.join(OUT, "k-overeni.md"),
  [
    "# Položky k ověření (v3)",
    "",
    "Každá otázka je rozhodnutelná. Uveďte ID a fotku.",
    "",
    ...[...qMap.values()].map(
      (q) =>
        `- **${q.id}**${q.photo ? ` (foto: ${q.photo})` : ""}: ${noEm(q.question)}`,
    ),
    "",
  ].join("\n"),
);

fs.writeFileSync(
  path.join(OUT, "souhrn-uprav.md"),
  [
    "# Souhrn úprav katalogu ready-v3",
    "",
    `Porovnání vůči: **${summary.comparedTo}**`,
    "",
    `## Počty`,
    `- Aktivní produkty: **${summary.activeProducts}**`,
    `- Potvrzená sloučení: **${mergedCount}**`,
    `- Obnovené samostatné produkty (vrácené z v2 sloučení): **${restoredCount}**`,
    `- Přejmenování (action=renamed): **${renamedCount}**`,
    `- Otázky k ověření: **${summary.questions}**`,
    `- WebP v aktivních produktech: **${totalWebpActive}** (očekáváno 540)`,
    `- WebP v _archived (originály sloučených): **${totalWebpArchived}**`,
    "",
    "## Potvrzená sloučení",
    ...archived.map(
      (a) =>
        `- **${a.id} → ${a.intoId}**: ${noEm(a.reason)} _Důkaz:_ ${noEm(a.evidence)}`,
    ),
    "",
    "## Obnovené produkty (neověřená sloučení z v2)",
    ...RESTORED_MERGES.map(
      (r) => `- **${r.id}** (bylo do ${r.wasInto}): ${noEm(r.reason)}`,
    ),
    "",
    "## Import - nevyřešené",
    ...importNotes.map((n) => `- **${n.productId}** (${n.issue}): ${noEm(n.note)}`),
    "",
    "## Validace",
    `- Em dash: ${validation.emdash.length}`,
    `- Popisy s barvou/počtem: ${validation.badDesc.length}`,
    `- Farby s čárkami: ${validation.commaFarby.length}`,
    `- Chybějící WebP v rozsahu: ${validation.missingWebp.length}`,
    `- Opakované popisy (≥5×): ${Object.keys(validation.genericDesc).length}`,
    "",
    "## JPG vs WebP",
    summary.jpgVsWebp,
    "",
    "Originál `ready` a `ready-v2` beze změny. Pracovní kopie: `noveprodukty5.9.26-ready-v3`. Nic nepublikováno.",
    "",
  ].join("\n"),
);

// Copy reports into v3
const reportsDest = path.join(ROOT, "_reports");
fs.mkdirSync(reportsDest, { recursive: true });
for (const f of fs.readdirSync(OUT)) {
  fs.copyFileSync(path.join(OUT, f), path.join(reportsDest, f));
}
fs.writeFileSync(
  path.join(ROOT, "spolecna-galerie.json"),
  JSON.stringify(commonGallery, null, 2),
);
fs.writeFileSync(
  path.join(ROOT, "import-poznamky.json"),
  JSON.stringify(importNotes, null, 2),
);

fs.writeFileSync(
  path.join(ROOT, "STAV.md"),
  [
    "# Katalóg batch 5.9.26 - ready-v3",
    "",
    "Opravená pracovná kópia voči v2.",
    "Originál ready a ready-v2: nezmenené.",
    "",
    `Aktívne produkty: ${summary.activeProducts}`,
    `Potvrdené zlúčenia: ${mergedCount}`,
    `Obnovené samostatné: ${restoredCount}`,
    "",
    "Reporty: `_reports/` a `scripts/katalog-5-9-26/v3-reports/`",
    "",
  ].join("\n"),
);

console.log(JSON.stringify(summary, null, 2));
