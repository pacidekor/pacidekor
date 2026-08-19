/**
 * Pair products that have a color in the name with multi-variant hub cards.
 * Run: node scripts/analyze-color-pairs.mjs [path-to-products.json]
 */
import fs from "node:fs";
import path from "node:path";

const COLOR_PATTERNS = [
  { re: /\b(biel[aeoyú]|bielu)\b/i, id: "biela", label: "Biela" },
  { re: /\b(červen[áaéey]|cerven[áaéey])\b/i, id: "cervena", label: "Červená" },
  { re: /\b(ružov[áaéey]|ruzov[áaéey]|svetloružov[áaéey]|bledoružov[áaéey]|staroružov[áaéey]|oranžovoružov[áaéey]|červeno-?ružov[áaéey]|zeleno-?ružov[áaéey]|vínovo-?krémov[áaéey]|krémovo-?petrolejov[áaéey])\b/i, id: "ruzova", label: "Ružová" },
  { re: /\b(fialov[áaéey]|sivo-?modr[áaéey])\b/i, id: "fialova", label: "Fialová" },
  { re: /\b(zelen[áaéey]|svetlozelen[áaéey]|tmavozelen[áaéey]|hnedozelen[áaéey]|sivozelen[áaéey])\b/i, id: "zelena", label: "Zelená" },
  { re: /\b(krémov[áaéey]|kremov[áaéey])\b/i, id: "kremova", label: "Krémová" },
  { re: /\b(oranžov[áaéey]|oranzov[áaéey]|oranžovo-?žlt[áaéey])\b/i, id: "oranzova", label: "Oranžová" },
  { re: /\b(žlt[áaéey]|zlt[áaéey]|limetkov[áaéey])\b/i, id: "zlta", label: "Žltá" },
  { re: /\b(modr[áaéey])\b/i, id: "modra", label: "Modrá" },
  { re: /\b(hned[áaéey]|hnedozelen[áaéey])\b/i, id: "hneda", label: "Hnedá" },
  { re: /\b(bordov[áaéey]|vínov[áaéey])\b/i, id: "bordova", label: "Bordová" },
  { re: /\b(marhuľov[áaéey])\b/i, id: "marhulova", label: "Marhuľová" },
  { re: /\b(tmavoružov[áaéey])\b/i, id: "tmavoruzova", label: "Tmavoružová" },
  { re: /\b(pestrobarvn[ýáaé]|farebn[ýáaé])\b/i, id: null, label: "mix" },
];

const FORM_PATTERNS = [
  { re: /\bkytica\b/i, form: "kytica" },
  { re: /\bkytice\b/i, form: "kytica" },
  { re: /\bna stopke\b|\bstopk[aoáeéy]\b|\bstonok\b|\bstonku\b|\bspray\b/i, form: "stopka" },
  { re: /\bhalúzk|\bhaluzk|\bvetva\b|\bvětva\b/i, form: "haluzka" },
  { re: /\bzväzok\b|\bzväzok\b|\b-zväzok\b/i, form: "zvazok" },
  { re: /\bvencovk|\bvenc\b/i, form: "vencovka" },
  { re: /\blist\b|\bzelen\b|\bbrečtan\b|\beukalypt|\basparág|\basparag|\bruskus\b|\bfiller\b|\bperovit/i, form: "list" },
];

const NOISE = [
  /\bexclusive\b/gi,
  /\bbeauty\b/gi,
  /\b\d+\s*cm\b/gi,
  /\b\d+\s*mm\b/gi,
  /\b-\s*zväzok\b/gi,
  /\bs\s*levanduľou\b/gi,
  /\ba\s*hortenzi[íi]\b/gi,
  /\bso\s*zeleňou\b/gi,
  /\bs\s*výplňou\b/gi,
  /\bs\s*drobnými\b/gi,
  /\bdrobných\b/gi,
  /\bdlh[áaé]\b/gi,
  /\bdlhý\b/gi,
  /\bzáhradn[áaé]\b/gi,
  /\bmini\b/gi,
  /\bsvetlo\b/gi,
  /\btmavo\b/gi,
  /\bna\b/gi,
  /\b-\b/g,
];

function stripDiacritics(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function detectColorInName(name) {
  for (const p of COLOR_PATTERNS) {
    if (p.re.test(name)) return { id: p.id, label: p.label, match: name.match(p.re)?.[0] };
  }
  return null;
}

function detectForm(name) {
  for (const p of FORM_PATTERNS) {
    if (p.re.test(name)) return p.form;
  }
  return "other";
}

function normalizeBaseName(name) {
  let n = name;
  for (const p of COLOR_PATTERNS) n = n.replace(p.re, " ");
  for (const p of FORM_PATTERNS) n = n.replace(p.re, " ");
  for (const re of NOISE) n = n.replace(re, " ");
  n = stripDiacritics(n.toLowerCase())
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // singular-ish stems
  n = n
    .replace(/\bruze\b/g, "ruza")
    .replace(/\bruze\b/g, "ruza")
    .replace(/\bruza\b/g, "ruza")
    .replace(/\bpivonky\b/g, "pivonka")
    .replace(/\bpivoniek\b/g, "pivonka")
    .replace(/\bhortenzie\b/g, "hortenzia")
    .replace(/\bhortenzii\b/g, "hortenzia")
    .replace(/\bchryzantem\b/g, "chryzantema")
    .replace(/\bgypsofilky\b/g, "gypsofilka")
    .replace(/\bruze\b/g, "ruza");
  return n;
}

function colorLabels(ids) {
  const map = {
    biela: "Biela",
    cervena: "Červená",
    ruzova: "Ružová",
    fialova: "Fialová",
    zelena: "Zelená",
    kremova: "Krémová",
    oranzova: "Oranžová",
    zlta: "Žltá",
    modra: "Modrá",
    hneda: "Hnedá",
    seda: "Sivá",
  };
  return (ids ?? []).map((id) => {
    if (id.startsWith("custom:")) {
      const parts = id.split(":");
      return decodeURIComponent(parts[2] ?? parts[1] ?? id);
    }
    return map[id] ?? id;
  });
}

function loadProducts(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const inner = raw.match(/<untrusted-data[^>]*>\n([\s\S]*?)\n<\/untrusted-data/);
  if (inner) return JSON.parse(inner[1]);
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.result)) return parsed.result;
  if (typeof parsed.result === "string") {
    const m = parsed.result.match(/<untrusted-data[^>]*>\n([\s\S]*?)\n<\/untrusted-data/);
    if (m) return JSON.parse(m[1]);
  }
  return parsed;
}

function scoreHub(p) {
  return (p.color_ids?.length ?? 0) * 10 + (p.images?.length ?? 0);
}

function main() {
  const input =
    process.argv[2] ??
    "C:/Users/tomas/.cursor/projects/c-Users-tomas-Desktop-projekty-pacidekor-pacidekornavrh1/agent-tools/4f36165c-3c39-4f3e-be27-5f22c834c7dd.txt";
  const products = loadProducts(input).map((p) => ({
    ...p,
    nameColor: detectColorInName(p.name),
    form: detectForm(p.name),
    base: normalizeBaseName(p.name),
    colorCount: p.color_ids?.length ?? 0,
    colorLabels: colorLabels(p.color_ids),
  }));

  const hubs = products.filter((p) => p.colorCount >= 2 && !p.nameColor);
  const colored = products.filter((p) => p.nameColor && p.nameColor.id);

  const groups = new Map();
  for (const p of products) {
    const key = `${p.category}::${p.form}::${p.base}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }

  const pairs = [];

  for (const p of colored) {
    const key = `${p.category}::${p.form}::${p.base}`;
    const bucket = groups.get(key) ?? [];
    const candidates = bucket.filter(
      (h) => h.id !== p.id && h.colorCount >= 2 && !h.nameColor,
    );
    if (candidates.length === 0) continue;

    candidates.sort((a, b) => scoreHub(b) - scoreHub(a));
    const hub = candidates[0];
    const hubHasColor = hub.color_ids?.includes(p.nameColor.id) ||
      hub.colorLabels.some((l) =>
        stripDiacritics(l.toLowerCase()).includes(
          stripDiacritics((p.nameColor.label ?? "").toLowerCase()),
        ),
      );

    pairs.push({
      key,
      satellite: {
        sku: p.sku,
        name: p.name,
        colors: p.colorLabels,
        nameColor: p.nameColor.label,
        nameColorId: p.nameColor.id,
        form: p.form,
        inStock: p.in_stock,
      },
      hub: {
        sku: hub.sku,
        name: hub.name,
        colors: hub.colorLabels,
        colorCount: hub.colorCount,
        form: hub.form,
        inStock: hub.in_stock,
      },
      hubHasColor,
      allHubCandidates: candidates.map((c) => ({
        sku: c.sku,
        name: c.name,
        colorCount: c.colorCount,
        colors: c.colorLabels,
      })),
    });
  }

  // dedupe by satellite sku
  const seen = new Set();
  const uniquePairs = pairs.filter((p) => {
    if (seen.has(p.satellite.sku)) return false;
    seen.add(p.satellite.sku);
    return true;
  });

  uniquePairs.sort((a, b) =>
    a.hub.name.localeCompare(b.hub.name, "sk"),
  );

  const unpairedColored = colored.filter(
    (p) => !uniquePairs.some((pair) => pair.satellite.sku === p.sku),
  );

  const out = {
    generatedAt: new Date().toISOString(),
    totalProducts: products.length,
    coloredInName: colored.length,
    multiVariantHubs: hubs.length,
    pairedCount: uniquePairs.length,
    unpairedColoredCount: unpairedColored.length,
    pairs: uniquePairs,
    unpairedColored: unpairedColored.map((p) => ({
      sku: p.sku,
      name: p.name,
      form: p.form,
      base: p.base,
      colors: p.colorLabels,
      nameColor: p.nameColor?.label,
    })),
  };

  const outPath = path.resolve("tmp/color-pair-audit.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log("Wrote", outPath);
  console.log(
    `Products: ${out.totalProducts}, colored names: ${out.coloredInName}, pairs: ${out.pairedCount}, unpaired colored: ${out.unpairedColoredCount}`,
  );
}

main();
