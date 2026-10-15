import fs from "node:fs";
import path from "node:path";

function loadEnv() {
  const p = path.join(process.cwd(), ".env.local");
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(t.slice(0, i) in process.env)) process.env[t.slice(0, i).trim()] = v;
  }
}
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const res = await fetch(
  `${url}/rest/v1/products?select=id,slug,name,images,color_ids,color_image_map&limit=400`,
  { headers: { apikey: key, Authorization: `Bearer ${key}` } },
);
const rows = await res.json();
const hits = [];
for (const p of rows) {
  const map = p.color_image_map || {};
  const imgs = p.images || [];
  const entries = Object.entries(map);
  if (entries.length < 2) continue;
  const urls = new Set();
  for (const [, idxs] of entries) {
    if (!Array.isArray(idxs) || !idxs.length) continue;
    const u = imgs[idxs[0]];
    if (u) urls.add(u);
  }
  if (urls.size >= 2) {
    hits.push({
      slug: p.slug,
      name: p.name,
      colors: entries.length,
      distinctPrimary: urls.size,
      urls: [...urls].slice(0, 4),
    });
  }
}
console.log(JSON.stringify(hits.slice(0, 10), null, 2));
