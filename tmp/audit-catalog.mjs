import fs from "node:fs";

function fold(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const COLOR_WORDS = [
  ["bordova", /bordo/],
  ["biela", /biel/],
  ["cervena", /cerv/],
  ["ruzova", /ruzov|staroruz/],
  ["fialova", /fial/],
  ["zelena", /zelen/],
  ["kremova", /krem|smotan/],
  ["oranzova", /oranz|broskyn|losos/],
  ["zlta", /zlt/],
  ["modra", /modr/],
  ["hneda", /hned/],
  ["seda", /siv|seda/],
  ["cerna", /ciern/],
  ["ruzovobiela", /ruzovo ?biel/],
];

function colorFromText(t) {
  const f = fold(t);
  for (const [id, re] of COLOR_WORDS) {
    if (re.test(f)) return id;
  }
  return null;
}

function parseColorLabel(id) {
  if (!id) return null;
  if (id.startsWith("custom:")) {
    const sep = id.indexOf(":", 7);
    if (sep === -1) return id;
    try {
      return decodeURIComponent(id.slice(sep + 1));
    } catch {
      return id.slice(sep + 1);
    }
  }
  return id;
}

function stemName(name) {
  let t = fold(name);
  t = t
    .replace(/\b\d+\s?(cm|mm|ks|ks\.|x)\b/g, " ")
    .replace(/\b(kremova|kremovy|kremove|fialova|fialovy|fialove|biela|biely|biele|cervena|cerveny|cervene|ruzova|ruzovy|ruzove|staroruzova|zelena|zeleny|zelene|oranzova|oranzovy|oranzove|zlta|zlty|zlte|modra|modry|modre|hneda|hnedy|hnede|seda|sedy|sede|siva|sivy|sive|bordova|bordovy|bordove|cierna|cierny|cierne|broskynova|lososova|smotanova)\b/g, " ")
    .replace(/\b(mini|maxi|spray|stopka|stopkove|stopkovy|kytica|kyticka|zvazok|haluzka|vetvicka|vetva|vencovka)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return t;
}

function formKey(p) {
  const sub = p.subcategory_id || "";
  const n = fold(p.name);
  if (sub === "kytice" || /kytica|kyticka|zvazok/.test(n)) return "kytica";
  if (sub === "vencovky" || /vencov/.test(n)) return "vencovka";
  if (sub === "listy" || /list|paprad|eukalypt|palma|zelen/.test(n)) return "list";
  if (/haluz|vetvick|vetva|kvitnuc/.test(n) || sub === "doplnky") return "haluzka";
  if (sub === "stopkove-kvety" || /stopk/.test(n)) return "stopka";
  return sub || "other";
}

function sizeInName(name) {
  const m = String(name).match(/(\d+)\s?cm/i);
  return m ? `${m[1]} cm` : null;
}

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const res = await fetch(
  `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/products?select=id,sku,slug,name,category,subcategory_id,druh_id,color_ids,images,created_at,updated_at,price,description&order=created_at.asc`,
  {
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    },
  },
);
if (!res.ok) throw new Error(await res.text());
const raw = await res.json();

const druhRes = await fetch(
  `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/druhy?select=id,label`,
  {
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    },
  },
);
const druhy = Object.fromEntries((await druhRes.json()).map((d) => [d.id, d.label]));

const products = raw.map((p) => {
  const created = new Date(p.created_at);
  const batch = created < new Date("2026-08-01") ? "old" : "new";
  const colors = (p.color_ids || []).map(parseColorLabel);
  return {
    id: p.id,
    sku: p.sku,
    slug: p.slug,
    name: p.name,
    category: p.category,
    subcategory_id: p.subcategory_id,
    druh_id: p.druh_id,
    druh: druhy[p.druh_id] || p.druh_id || "(bez druhu)",
    colors,
    colorCount: colors.length,
    imageCount: (p.images || []).length,
    firstImage: (p.images || [])[0] || null,
    created_at: p.created_at,
    batch,
    price: p.price,
    size: sizeInName(p.name),
    colorInName: colorFromText(p.name),
    stem: stemName(p.name),
    form: formKey(p),
    desc: (p.description || "").slice(0, 180),
  };
});

const byDruh = {};
for (const p of products) {
  (byDruh[p.druh_id || "_none"] ||= []).push(p);
}

const exactNames = {};
for (const p of products) {
  const k = fold(p.name);
  (exactNames[k] ||= []).push(p);
}
const exactDupes = Object.values(exactNames).filter((g) => g.length > 1);

const colorInName = products.filter((p) => p.colorInName);
const sizeInNameList = products.filter((p) => p.size);
const singleColor = products.filter((p) => p.colorCount <= 1 && p.category === "Umelé kvety");

// Groups: same druh + same form + similar stem
const mergeCandidates = [];
for (const [druhId, list] of Object.entries(byDruh)) {
  if (list.length < 2) continue;
  const byForm = {};
  for (const p of list) (byForm[p.form] ||= []).push(p);
  for (const [form, items] of Object.entries(byForm)) {
    if (items.length < 2) continue;
    const byStem = {};
    for (const p of items) {
      const k = p.stem || fold(p.name);
      (byStem[k] ||= []).push(p);
    }
    for (const [stem, group] of Object.entries(byStem)) {
      if (group.length >= 2) {
        mergeCandidates.push({ druhId, form, stem, products: group });
      }
    }
    // also: same druh+form, one has colors in name, others don't
    if (items.length >= 2) {
      const withColorName = items.filter((p) => p.colorInName);
      if (withColorName.length >= 2 || (withColorName.length >= 1 && items.length >= 2)) {
        const already = mergeCandidates.some(
          (c) => c.druhId === druhId && c.form === form && c.products.length === items.length,
        );
        if (!already && items.length >= 2) {
          mergeCandidates.push({
            druhId,
            form,
            stem: `(celý druh ${form})`,
            products: items,
            note: "same druh+form, possibly different varieties",
          });
        }
      }
    }
  }
}

const stats = {
  total: products.length,
  old: products.filter((p) => p.batch === "old").length,
  new: products.filter((p) => p.batch === "new").length,
  byCategory: {},
  byDruh: Object.entries(byDruh)
    .map(([id, list]) => ({
      id,
      label: druhy[id] || id,
      n: list.length,
      old: list.filter((p) => p.batch === "old").length,
      new: list.filter((p) => p.batch === "new").length,
      names: list.map((p) => `${p.batch === "new" ? "NEW" : "OLD"} ${p.sku} | ${p.name} | ${p.form} | ${p.colorCount} farieb [${p.colors.join(", ")}]`),
    }))
    .sort((a, b) => b.n - a.n),
};

for (const p of products) {
  stats.byCategory[p.category] = (stats.byCategory[p.category] || 0) + 1;
}

const compact = products.map((p) => ({
  sku: p.sku,
  name: p.name,
  batch: p.batch,
  druh: p.druh,
  druh_id: p.druh_id,
  form: p.form,
  sub: p.subcategory_id,
  colors: p.colors,
  colorCount: p.colorCount,
  size: p.size,
  colorInName: p.colorInName,
  stem: p.stem,
  firstImage: p.firstImage,
  created_at: p.created_at,
}));

fs.writeFileSync("tmp/catalog-audit.json", JSON.stringify({ stats, compact, exactDupes, colorInName: colorInName.map(p => p.name), sizeInNameList: sizeInNameList.map(p => p.name), mergeCandidates }, null, 2));

console.log("TOTAL", stats.total, "OLD", stats.old, "NEW", stats.new);
console.log("\n=== EXACT NAME DUPES ===");
for (const g of exactDupes) {
  console.log(g.map((p) => `${p.batch} ${p.sku} ${p.name} (${p.colorCount}c)`).join(" | "));
}
console.log("\n=== SIZE IN NAME ===");
for (const p of sizeInNameList) console.log(`${p.batch} ${p.sku} ${p.name}`);
console.log("\n=== COLOR IN NAME ===");
for (const p of colorInName) console.log(`${p.batch} ${p.sku} ${p.name} [${p.colors.join(", ")}]`);
console.log("\n=== DRUH GROUPS (2+) ===");
for (const d of stats.byDruh.filter((x) => x.n >= 2)) {
  console.log(`\n## ${d.label} (${d.n} = ${d.old} old + ${d.new} new)`);
  for (const n of d.names) console.log("  " + n);
}
