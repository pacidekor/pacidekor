/**
 * Report multi-color IMP-NEJ products + whether overview (index 0) leaked into color maps.
 * Usage: node scripts/report-multicolor-imports.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const env = {};
for (const line of readFileSync(resolve(".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
}

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function colorLabel(id) {
  if (!id.startsWith("custom:")) return id;
  const raw = id.slice("custom:".length);
  const sep = raw.indexOf(":");
  if (sep === -1) return id;
  try {
    return decodeURIComponent(raw.slice(sep + 1));
  } catch {
    return raw.slice(sep + 1);
  }
}

const { data, error } = await sb
  .from("products")
  .select("id, sku, name, category, color_ids, images, color_image_map")
  .like("sku", "IMP-NEJ-%")
  .order("sku");
if (error) throw error;

const multi = (data || []).filter((p) => (p.color_ids || []).length >= 2);
const withOverviewPattern = multi.filter(
  (p) => (p.images || []).length >= (p.color_ids || []).length + 1,
);

let overviewLeak = 0;
const rows = [];

for (const p of multi) {
  const map = p.color_image_map || {};
  const usesZero = Object.values(map).some(
    (idxs) => Array.isArray(idxs) && idxs.includes(0),
  );
  const likelyOverview =
    (p.images || []).length >= (p.color_ids || []).length + 1;
  if (likelyOverview && usesZero) overviewLeak++;

  rows.push({
    sku: p.sku,
    name: p.name,
    category: p.category,
    colors: (p.color_ids || []).map(colorLabel).join(", "),
    images: (p.images || []).length,
    colorCount: (p.color_ids || []).length,
    map: JSON.stringify(map),
    overviewLikely: likelyOverview,
    overviewUsedAsColor: likelyOverview && usesZero,
    admin: `/admin/produkty` ,
    id: p.id,
  });
}

const outDir = resolve("public/nejnovejsiprodukty-ready");
const txt = [
  `Vícbarevné importované produkty (IMP-NEJ-*): ${multi.length}`,
  `Z toho pravděpodobně mají úvodní group shot (imgs >= colors+1): ${withOverviewPattern.length}`,
  `Group shot omylem přiřazen jako barevná fotka (index 0 v mapě): ${overviewLeak}`,
  "",
  "Formát: SKU | název | kategorie | #fotiek | farby | group0 v mape?",
  "=".repeat(80),
];

for (const r of rows) {
  txt.push(
    `${r.sku} | ${r.name} | ${r.category} | imgs ${r.images} | ${r.colors} | overviewLeak=${r.overviewUsedAsColor ? "ANO" : "nie"}`,
  );
}

writeFileSync(resolve(outDir, "KONTROLA-FARBY.txt"), txt.join("\n") + "\n", "utf8");
writeFileSync(
  resolve(outDir, "KONTROLA-FARBY.json"),
  JSON.stringify(rows, null, 2),
  "utf8",
);

console.log(txt.slice(0, 6).join("\n"));
console.log(`… celkem ${rows.length} řádků → public/nejnovejsiprodukty-ready/KONTROLA-FARBY.txt`);
console.log(`overview leaks: ${overviewLeak}`);
