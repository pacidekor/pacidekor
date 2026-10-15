/**
 * One-off: measure slim storefront index vs full list payload.
 * Dry-run only — no writes.
 */
import fs from "node:fs";
import path from "node:path";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i < 0) continue;
    const key = trimmed.slice(0, i).trim();
    let val = trimmed.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

async function fetchSelect(select) {
  const endpoint = `${url.replace(/\/$/, "")}/rest/v1/products?select=${encodeURIComponent(select)}&order=created_at.desc`;
  const res = await fetch(endpoint, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

const slimRows = await fetchSelect("id,category,color_ids,created_at");
const extendedRows = await fetchSelect(
  "id,category,color_ids,created_at,subcategory_id,druh_id,is_new,new_until,in_vypredaj,is_bestseller",
);
const fullRows = await fetchSelect(
  "id,slug,name,sku,price,original_price,discount,category,subcategory_id,druh_id,color_ids,packaging,images,in_stock,stock_quantity,is_new,new_until,in_vypredaj,is_bestseller,created_at,updated_at",
);

function toSlim(rows) {
  return rows.map((row) => ({
    id: String(row.id ?? ""),
    category: String(row.category ?? ""),
    colorIds: Array.isArray(row.color_ids)
      ? row.color_ids.filter((x) => typeof x === "string")
      : [],
    createdAt: String(row.created_at ?? ""),
  }));
}

function toExtended(rows) {
  return rows.map((row) => ({
    id: String(row.id ?? ""),
    category: String(row.category ?? ""),
    colorIds: Array.isArray(row.color_ids)
      ? row.color_ids.filter((x) => typeof x === "string")
      : [],
    createdAt: String(row.created_at ?? ""),
    subcategoryId: row.subcategory_id ?? null,
    druhId: row.druh_id ?? null,
    isNew: Boolean(row.is_new),
    newUntil: row.new_until ?? null,
    inVypredaj: Boolean(row.in_vypredaj),
    isBestseller: Boolean(row.is_bestseller),
  }));
}

const slimJson = JSON.stringify(toSlim(slimRows));
const extendedJson = JSON.stringify(toExtended(extendedRows));
const fullJson = JSON.stringify(fullRows);

console.log(
  JSON.stringify(
    {
      rows: slimRows.length,
      slimKB: +(Buffer.byteLength(slimJson) / 1024).toFixed(1),
      extendedKB: +(Buffer.byteLength(extendedJson) / 1024).toFixed(1),
      fullListKB: +(Buffer.byteLength(fullJson) / 1024).toFixed(1),
      fullVsSlim: +(Buffer.byteLength(fullJson) / Buffer.byteLength(slimJson)).toFixed(1),
      uses: {
        cached: "unstable_cache 120s + STOREFRONT_CATALOG_TAG",
        consumers: [
          "listPricedProductsPage (/produkty + /api/products/list)",
        ],
        frequency: "once per cache miss / deploy / tag revalidate; not per card",
      },
      verdict887:
        "Slim index ~modest at current catalog size; OK to keep. Extending with sub/druh/flags stays far below full list.",
    },
    null,
    2,
  ),
);
