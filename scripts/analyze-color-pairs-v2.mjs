/**
 * Pair color-in-name products with multi-variant hubs (v2 – flower-type aware).
 */
import fs from "node:fs";
import path from "node:path";

const FLOWER_ALIASES = {
  ruza: ["ruza", "ruze", "ruz", "ruzicky", "ruzicka"],
  pivonka: ["pivonka", "pivonie", "pivoniek"],
  hortenzia: ["hortenzia", "hortenzie", "hortenzii"],
  fiala: ["fiala", "fialy", "stopka fialy"],
  chryzantema: ["chryzantema", "chryzantem", "chryzantemy"],
  eukalyptus: ["eukalyptus"],
  voskovka: ["voskovka"],
  mecik: ["mecik", "mečík"],
  narcis: ["narcis", "narcisy"],
  tulipan: ["tulipan", "tulipany"],
  gerbera: ["gerbera", "gerbery"],
  georgin: ["georgin", "georgina", "georginy"],
  magnolia: ["magnolia", "magnolii"],
  gladiola: ["gladiola", "gladioly"],
  iskernik: ["iskernik", "iskerniky", "ranunculus"],
  klincek: ["klincek", "klinček"],
  margaretka: ["margaretka", "margarétka", "margarétky"],
  alstromeria: ["alstromeria", "alstroméria"],
  hyacint: ["hyacint"],
  ginkgo: ["ginkgo"],
  zelen: ["zelen", "zeleň", "list", "brečtan", "brečtan", "filler", "perovit"],
  mini_ruza: ["mini ruze", "mini ruza"],
};

const COLOR_WORDS = [
  { re: /\b(biel[aeoyúu]|bielo-)/i, id: "biela" },
  { re: /\b(červen[áaéey]|cerven[áaéey]|tmavočerven[áaéey])/i, id: "cervena" },
  { re: /\b(ružov[áaéey]|ruzov[áaéey]|svetloružov[áaéey]|bledoružov[áaéey]|staroružov[áaéey]|oranžovoružov[áaéey]|červeno-?ružov[áaéey]|tmavoružov[áaéey])/i, id: "ruzova" },
  { re: /\b(fialov[áaéey]|bielo-?fialov[áaéey])/i, id: "fialova" },
  { re: /\b(zelen[áaéey]|bielo-?zelen[áaéey]|svetlozelen[áaéey]|tmavozelen[áaéey]|sivozelen[áaéey]|hnedozelen[áaéey])/i, id: "zelena" },
  { re: /\b(krémov[áaéey]|kremov[áaéey]|krémových|krémové|vínovo-?krémov[áaéey]|krémovo-?petrolejov[áaéey])/i, id: "kremova" },
  { re: /\b(oranžov[áaéey]|oranzov[áaéey]|oranžovo-?žlt[áaéey])/i, id: "oranzova" },
  { re: /\b(žlt[áaéey]|zlt[áaéey]|bielo-?žlt[áaéey]|limetkov[áaéey])/i, id: "zlta" },
  { re: /\b(modr[áaéey]|sivo-?modr[áaéey])/i, id: "modra" },
  { re: /\b(hned[áaéey]|hnedým|hnedozelen[áaéey])/i, id: "hneda" },
  { re: /\b(bordov[áaéey]|vínov[áaéey])/i, id: "bordova" },
  { re: /\b(marhuľov[áaéey])/i, id: "marhulova" },
  { re: /\b(pestrobarvn[ýáaé]|farebn[éy]|viacfarby|mix)\b/i, id: null },
];

const FORM_RULES = [
  { re: /\bkytica\b|\bkytice\b|\bkytica\b/i, form: "kytica", weight: 3 },
  { re: /\bna stopke\b|\bna stonke\b|\bstopk[aoáeéy]\b|\bstonok\b|\bstonku\b|\bspray\b|\bbeauty\b/i, form: "stopka", weight: 3 },
  { re: /\bzväzok\b|\b-zväzok\b|\bzväzok\b/i, form: "zvazok", weight: 3 },
  { re: /\bhalúzk|\bhaluzk|\bvetva\b|\bvetvička\b|\bvetvičk|\bstonok\b/i, form: "haluzka", weight: 2 },
  { re: /\blist\b|\bzelen\b|\bbrečtan\b|\beukalypt|\bfiller\b|\bperovit|\basparág|\basparag|\bruskus\b/i, form: "list", weight: 2 },
  { re: /\bmini\b/i, form: "mini", weight: 1 },
];

function stripDiacritics(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function detectColors(name) {
  const found = [];
  for (const c of COLOR_WORDS) {
    if (c.re.test(name)) found.push(c);
  }
  return found;
}

function hasExplicitColorInName(name) {
  const colors = detectColors(name);
  // exclude "farebné varianty" only products
  if (colors.length === 1 && colors[0].id === null) return false;
  return colors.some((c) => c.id !== null);
}

function detectForm(name) {
  for (const r of FORM_RULES) {
    if (r.re.test(name)) return r.form;
  }
  return "general";
}

function detectFlower(name) {
  const n = stripDiacritics(name);
  if (/\bmini ruze\b|\bmini ruza\b/.test(n)) return "mini_ruza";
  for (const [key, aliases] of Object.entries(FLOWER_ALIASES)) {
    for (const a of aliases) {
      if (n.includes(stripDiacritics(a))) return key;
    }
  }
  return null;
}

function colorLabels(ids) {
  const map = {
    biela: "Biela", cervena: "Červená", ruzova: "Ružová", fialova: "Fialová",
    zelena: "Zelená", kremova: "Krémová", oranzova: "Oranžová", zlta: "Žltá",
    modra: "Modrá", hneda: "Hnedá", seda: "Sivá",
  };
  return (ids ?? []).map((id) => {
    if (id.startsWith("custom:")) {
      const parts = id.split(":");
      return decodeURIComponent(parts[2] ?? parts[1] ?? id);
    }
    return map[id] ?? id;
  });
}

function primaryNameColor(name) {
  for (const c of COLOR_WORDS) {
    if (c.id && c.re.test(name)) return c.id;
  }
  return null;
}

function loadProducts(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const m = raw.match(/<untrusted-data[^>]*>\n([\s\S]*?)\n<\/untrusted-data/);
  if (m) return JSON.parse(m[1]);
  const parsed = JSON.parse(raw);
  if (typeof parsed.result === "string") {
    const m2 = parsed.result.match(/<untrusted-data[^>]*>\n([\s\S]*?)\n<\/untrusted-data/);
    if (m2) return JSON.parse(m2[1]);
  }
  return parsed;
}

function formCompatible(a, b) {
  if (a === b) return true;
  if (a === "general" || b === "general") return true;
  if ((a === "stopka" && b === "zvazok") || (a === "zvazok" && b === "stopka")) return false;
  if (a === "kytica" && (b === "stopka" || b === "zvazok" || b === "haluzka")) return false;
  if (b === "kytica" && (a === "stopka" || a === "zvazok" || a === "haluzka")) return false;
  return false;
}

function scoreHub(p) {
  return (p.color_ids?.length ?? 0) * 100 + (p.images?.length ?? 0);
}

function main() {
  const input =
    process.argv[2] ??
    "C:/Users/tomas/.cursor/projects/c-Users-tomas-Desktop-projekty-pacidekor-pacidekornavrh1/agent-tools/4f36165c-3c39-4f3e-be27-5f22c834c7dd.txt";
  const raw = loadProducts(input).map((p) => {
    const nameColorId = primaryNameColor(p.name);
    const flower = detectFlower(p.name);
    const form = detectForm(p.name);
    return {
      sku: p.sku,
      name: p.name,
      category: p.category,
      colorCount: p.color_ids?.length ?? 0,
      colorIds: p.color_ids ?? [],
      colorLabels: colorLabels(p.color_ids),
      images: p.images?.length ?? 0,
      inStock: p.in_stock,
      flower,
      form,
      nameColorId,
      hasColorInName: hasExplicitColorInName(p.name),
    };
  });

  const hubs = raw.filter((p) => p.colorCount >= 2 && !p.hasColorInName);
  const satellites = raw.filter((p) => p.hasColorInName && p.nameColorId);

  const groups = new Map();
  for (const p of raw) {
    if (!p.flower) continue;
    const key = `${p.flower}::${p.form}`;
    if (!groups.has(key)) groups.set(key, { hubs: [], satellites: [], all: [] });
    const g = groups.get(key);
    g.all.push(p);
    if (p.colorCount >= 2 && !p.hasColorInName) g.hubs.push(p);
    if (p.hasColorInName) g.satellites.push(p);
  }

  const pairResults = [];

  for (const [key, g] of groups) {
    if (g.satellites.length === 0 || g.hubs.length === 0) continue;

    const sortedHubs = [...g.hubs].sort((a, b) => scoreHub(b) - scoreHub(a));
    const primaryHub = sortedHubs[0];

    for (const sat of g.satellites) {
      // pick best hub for this satellite
      const compatibleHubs = sortedHubs.filter((h) => formCompatible(h.form, sat.form));
      const hub = compatibleHubs[0] ?? primaryHub;
      const colorAlreadyOnHub =
        hub.colorIds.includes(sat.nameColorId) ||
        hub.colorLabels.some((l) =>
          stripDiacritics(l).includes(stripDiacritics(sat.nameColorId ?? "")),
        );

      pairResults.push({
        groupKey: key,
        flower: sat.flower,
        form: sat.form,
        hub: {
          sku: hub.sku,
          name: hub.name,
          colorCount: hub.colorCount,
          colors: hub.colorLabels,
          form: hub.form,
        },
        satellite: {
          sku: sat.sku,
          name: sat.name,
          nameColorId: sat.nameColorId,
          colors: sat.colorLabels,
          form: sat.form,
          inStock: sat.inStock,
        },
        colorAlreadyOnHub,
        alternateHubs: compatibleHubs.slice(1, 4).map((h) => ({
          sku: h.sku,
          name: h.name,
          colorCount: h.colorCount,
          colors: h.colorLabels,
        })),
      });
    }
  }

  // Also: kytica with color in name matching flower hubs with different form label
  // e.g. "Kytica krémových ruží" -> flower ruza, form kytica
  pairResults.sort((a, b) => {
    const fa = a.flower ?? "";
    const fb = b.flower ?? "";
    if (fa !== fb) return fa.localeCompare(fb, "sk");
    return a.satellite.name.localeCompare(b.satellite.name, "sk");
  });

  const unpairedSatellites = satellites.filter(
    (s) => !pairResults.some((p) => p.satellite.sku === s.sku),
  );

  const multiHubConflicts = [];
  for (const [key, g] of groups) {
    if (g.hubs.length >= 2) {
      multiHubConflicts.push({
        groupKey: key,
        hubs: g.hubs
          .sort((a, b) => scoreHub(b) - scoreHub(a))
          .map((h) => ({
            sku: h.sku,
            name: h.name,
            colorCount: h.colorCount,
            colors: h.colorLabels,
          })),
      });
    }
  }

  const out = {
    generatedAt: new Date().toISOString(),
    totalProducts: raw.length,
    stats: {
      withColorInName: raw.filter((p) => p.hasColorInName).length,
      multiVariantHubs: hubs.length,
      pairs: pairResults.length,
      unpairedColored: unpairedSatellites.length,
      multiHubGroups: multiHubConflicts.length,
    },
    pairs: pairResults,
    unpairedColored: unpairedSatellites.map((p) => ({
      sku: p.sku,
      name: p.name,
      flower: p.flower,
      form: p.form,
      nameColorId: p.nameColorId,
      colors: p.colorLabels,
    })),
    multiHubConflicts,
  };

  const outPath = path.resolve("tmp/color-pair-audit-v2.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out.stats, null, 2));
  console.log("Wrote", outPath);
}

main();
