import fs from "node:fs";

function fold(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const TYPES = [
  ["orchidea", ["orchidea", "oncidium", "cymbidium", "phalaenopsis"]],
  ["hortenzia", ["hortenz"]],
  ["eukalyptus", ["eukalypt"]],
  ["fiala", ["fiala"]],
  ["georgina", ["georgin", "cinia", "cinii"]],
  ["gladiola", ["gladiol", "mecik"]],
  ["gypsofilka", ["gypsofil", "nevestin"]],
  ["iskernik", ["iskern"]],
  ["jazmin", ["jazmin", "jasm"]],
  ["klincek", ["klincek", "klincek"]],
  ["magnolia", ["magnol"]],
  ["pivonka", ["pivon"]],
  ["ruza", ["ruza", "ruzi", "ruze", "ruzic"]],
  ["kala", ["kala"]],
  ["voskovka", ["voskov", "vres"]],
  ["chryzantema", ["chryzant"]],
  ["tulipan", ["tulip"]],
  ["protea", ["protea"]],
  ["ceresna", ["ceresn"]],
  ["gerbera", ["gerber"]],
  ["alstromeria", ["alstrom"]],
  ["anturia", ["antur"]],
  ["lalia", ["lali"]],
  ["paprad", ["paprad"]],
  ["list", ["palmov", "listova", "listovy", "zelen"]],
  ["orgovan", ["orgovan"]],
  ["petunia", ["petun"]],
  ["kurkuma", ["kurkum"]],
  ["artichoka", ["articok", "articok"]],
  ["slnecnica", ["slnecn"]],
  ["margaretka", ["margaret", "sedmokras"]],
  ["aster", ["aster", "astra"]],
  ["molucenka", ["molucenk"]],
  ["zlatydazd", ["zlaty daz"]],
  ["hviezdica", ["hviezdic"]],
  ["koral", ["koral"]],
  ["rozchodnik", ["rozchodn"]],
];

function detectType(text) {
  const t = fold(text);
  for (const [id, keys] of TYPES) {
    if (keys.some((k) => t.includes(k))) return id;
  }
  return "other";
}

function colorKey(c) {
  const t = fold(c).replace(/ova$/, "ova");
  if (t.includes("biel")) return "biela";
  if (t.includes("cerv") || t.includes("bordo")) return "cervena";
  if (t.includes("ruz")) return "ruzova";
  if (t.includes("fial")) return "fialova";
  if (t.includes("zelen")) return "zelena";
  if (t.includes("krem") || t.includes("smotan")) return "kremova";
  if (t.includes("oranz") || t.includes("broskyn") || t.includes("losos")) return "oranzova";
  if (t.includes("zlt")) return "zlta";
  if (t.includes("modr")) return "modra";
  if (t.includes("hned")) return "hneda";
  if (t.includes("siv") || t.includes("sed")) return "seda";
  return t.split(" ")[0] || t;
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

const catalog = JSON.parse(fs.readFileSync("scripts/paci-nove/catalog.json", "utf8"));
const map = JSON.parse(fs.readFileSync("scripts/paci-nove/export-map.json", "utf8"));

const shopRes = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/products?select=name,slug,sku,druh_id,subcategory_id,color_ids&order=name`, {
  headers: {
    apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
  },
});
if (!shopRes.ok) throw new Error("shop fetch " + shopRes.status + " " + (await shopRes.text()));
const shop = await shopRes.json();

const bySource = Object.fromEntries(map.map((m) => [String(m.source), m]));

const news = catalog.map((p) => {
  const out = bySource[String(p.sourceFolder)];
  return {
    out: out?.out,
    source: p.sourceFolder,
    name: p.name,
    druh: p.druh,
    sub: p.subcategory,
    colors: (p.colors || []).map(colorKey),
    type: detectType(`${p.name} ${p.druh}`),
  };
});

const shopN = shop.map((p) => ({
  ...p,
  type: detectType(`${p.name} ${p.druh_id || ""}`),
  colors: (p.color_ids || []).map((c) => {
    if (c.startsWith("custom:")) {
      try {
        return colorKey(decodeURIComponent(c.split(":").slice(2).join(":")));
      } catch {
        return colorKey(c);
      }
    }
    return colorKey(c);
  }),
}));

function overlap(a, b) {
  const A = new Set(a);
  let n = 0;
  for (const x of b) if (A.has(x)) n++;
  return n;
}

const internal = {};
for (const n of news) {
  (internal[n.type] ||= []).push(n);
}

const shopHits = [];
for (const n of news) {
  const cands = shopN.filter((s) => s.type === n.type && n.type !== "other" && n.type !== "list");
  if (!cands.length) continue;
  const scored = cands
    .map((s) => {
      const col = overlap(n.colors, s.colors);
      const sameSub =
        fold(n.sub).includes("kytic") && s.subcategory_id === "kytice"
          ? 1
          : fold(n.sub).includes("stopk") && s.subcategory_id === "stopkove-kvety"
            ? 1
            : fold(n.sub).includes("list") && s.subcategory_id === "listy"
              ? 1
              : 0;
      const nameHit =
        fold(n.name).split(" ").filter((w) => w.length > 4 && fold(s.name).includes(w)).length;
      const score = 3 + col + sameSub + Math.min(2, nameHit);
      return { s, col, sameSub, score };
    })
    .sort((a, b) => b.score - a.score);
  const top = scored[0];
  shopHits.push({
    out: n.out,
    source: n.source,
    name: n.name,
    type: n.type,
    shop: top.s.name,
    sku: top.s.sku,
    slug: top.s.slug,
    colorOverlap: top.col,
    sameForm: top.sameSub,
    candidates: cands.length,
  });
}

const noShop = news.filter((n) => !shopHits.some((h) => h.out === n.out));

const internalDupes = Object.entries(internal)
  .filter(([, arr]) => arr.length > 1 && arr[0].type !== "other")
  .map(([type, arr]) => ({ type, items: arr.map((x) => `${x.out} (${x.name})`) }));

fs.writeFileSync(
  "scripts/paci-nove/duplicate-report.json",
  JSON.stringify({ shopHits, noShop: noShop.map((n) => ({ out: n.out, name: n.name, type: n.type })), internalDupes }, null, 2),
);

console.log("NEW", news.length, "SHOP", shopN.length);
console.log("shop type matches", shopHits.length);
console.log("no shop type", noShop.length);
console.log("\n=== INTERNAL SAME TYPE ===");
for (const g of internalDupes.sort((a, b) => b.items.length - a.items.length)) {
  console.log(g.type + " (" + g.items.length + "): " + g.items.join(" | "));
}
console.log("\n=== SHOP MATCHES ===");
for (const h of shopHits.sort((a, b) => a.type.localeCompare(b.type) || a.out - b.out)) {
  console.log(
    `#${h.out} ${h.name}  ->  ${h.shop} [${h.sku}] colors=${h.colorOverlap} form=${h.sameForm} n=${h.candidates}`,
  );
}
console.log("\n=== LIKELY NEW TYPES ===");
for (const n of noShop.sort((a, b) => a.out - b.out)) {
  console.log(`#${n.out} ${n.name} (${n.type})`);
}
