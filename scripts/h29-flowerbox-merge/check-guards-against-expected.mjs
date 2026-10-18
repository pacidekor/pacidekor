/**
 * Compare live product rows to approved expected-pre.json.
 * On any difference: print diffs and exit 1 (STOP).
 * NEVER rewrites expected-pre.json or activate.sql guards.
 *
 * Usage (read-only against whatever SUPABASE URL/key you pass):
 *   node scripts/h29-flowerbox-merge/check-guards-against-expected.mjs
 *
 * Optional: H29_LIVE_JSON=path/to/live-products.json (array of 3 rows) skips network.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const expected = JSON.parse(
  readFileSync(join(__dirname, "expected-pre.json"), "utf8"),
);

const FIELDS = [
  "id",
  "sku",
  "slug",
  "name",
  "price",
  "packaging",
  "in_stock",
  "stock_quantity",
  "color_ids",
  "color_image_map",
  "shared_image_urls",
  "unavailable_color_ids",
  "images",
  "updated_at",
  "archived_at",
  "redirect_to_product_id",
];

function canon(v) {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .map((k) => [k, canon(v[k])]),
    );
  }
  return v;
}

function same(a, b) {
  return JSON.stringify(canon(a)) === JSON.stringify(canon(b));
}

function imagesMd5(images) {
  if (!Array.isArray(images)) return null;
  return createHash("md5").update(images.join("\n"), "utf8").digest("hex");
}

/** Parse PG timestamptz text to epoch ms (handles local offset display). */
function sameInstant(a, b) {
  const toMs = (s) => {
    let t = String(s).trim().replace(" ", "T");
    t = t.replace(/\.(\d{3})\d+/, ".$1");
    t = t.replace(/([+-]\d{2})$/, "$1:00");
    return Date.parse(t);
  };
  const ma = toMs(a);
  const mb = toMs(b);
  return !Number.isNaN(ma) && !Number.isNaN(mb) && ma === mb;
}

function normalizeLive(row) {
  return {
    id: row.id,
    sku: row.sku,
    slug: row.slug,
    name: row.name,
    price: row.price,
    packaging: row.packaging,
    in_stock: row.in_stock,
    stock_quantity: row.stock_quantity ?? null,
    color_ids: row.color_ids,
    color_image_map: row.color_image_map,
    shared_image_urls: row.shared_image_urls ?? null,
    unavailable_color_ids: row.unavailable_color_ids ?? [],
    images: row.images,
    updated_at: String(row.updated_at || "")
      .replace("T", " ")
      .replace("Z", "+00"),
    archived_at: row.archived_at ?? null,
    redirect_to_product_id: row.redirect_to_product_id ?? null,
  };
}

function expectedSlice(exp) {
  return {
    id: exp.id,
    sku: exp.sku,
    slug: exp.slug,
    name: exp.name,
    price: exp.price,
    packaging: exp.packaging,
    in_stock: exp.in_stock,
    stock_quantity: exp.stock_quantity ?? null,
    color_ids: exp.color_ids,
    color_image_map: exp.color_image_map,
    shared_image_urls: exp.shared_image_urls ?? null,
    unavailable_color_ids: exp.unavailable_color_ids ?? [],
    images_n: exp.images_n,
    images_md5: exp.images_md5,
    updated_at: exp.updated_at,
    archived_at: exp.archived_at ?? null,
    redirect_to_product_id: exp.redirect_to_product_id ?? null,
  };
}

function diffProduct(label, liveRaw, exp) {
  const live = normalizeLive(liveRaw);
  const want = expectedSlice(exp);
  const diffs = [];

  for (const f of [
    "id",
    "sku",
    "slug",
    "name",
    "price",
    "packaging",
    "in_stock",
    "stock_quantity",
    "color_ids",
    "color_image_map",
    "unavailable_color_ids",
    "archived_at",
    "redirect_to_product_id",
  ]) {
    if (!same(live[f], want[f])) {
      diffs.push({ field: f, live: live[f], expected: want[f] });
    }
  }

  // shared: expected-pre may omit for sources
  if ("shared_image_urls" in exp) {
    if (!same(live.shared_image_urls, want.shared_image_urls)) {
      diffs.push({
        field: "shared_image_urls",
        live: live.shared_image_urls,
        expected: want.shared_image_urls,
      });
    }
  }

  const n = Array.isArray(live.images) ? live.images.length : -1;
  if (n !== want.images_n) {
    diffs.push({ field: "images_n", live: n, expected: want.images_n });
  }
  const md5 = imagesMd5(live.images);
  if (md5 !== want.images_md5) {
    diffs.push({ field: "images_md5", live: md5, expected: want.images_md5 });
  }

  // updated_at: compare as absolute instants across PG display forms
  // (space vs T, +00 vs +00:00/+02:00, micro vs milli fractional seconds).
  if (!sameInstant(live.updated_at, want.updated_at)) {
    diffs.push({
      field: "updated_at",
      live: live.updated_at,
      expected: want.updated_at,
    });
  }

  return { label, sku: want.sku, diffs };
}

async function loadLive() {
  if (process.env.H29_LIVE_JSON) {
    return JSON.parse(readFileSync(process.env.H29_LIVE_JSON, "utf8"));
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "STOP: set NEXT_PUBLIC_SUPABASE_URL + anon/service key, or H29_LIVE_JSON=path",
    );
    process.exit(2);
  }
  const ids = [
    expected.target.id,
    expected.source082.id,
    expected.source071.id,
  ].join(",");
  const res = await fetch(
    `${url}/rest/v1/products?id=in.(${ids})&select=*`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    },
  );
  if (!res.ok) {
    console.error("STOP: live fetch failed", res.status, await res.text());
    process.exit(2);
  }
  return res.json();
}

const liveRows = await loadLive();
const byId = new Map(liveRows.map((r) => [r.id, r]));

const reports = [
  diffProduct("target", byId.get(expected.target.id) || {}, expected.target),
  diffProduct(
    "source082",
    byId.get(expected.source082.id) || {},
    expected.source082,
  ),
  diffProduct(
    "source071",
    byId.get(expected.source071.id) || {},
    expected.source071,
  ),
];

const allDiffs = reports.filter((r) => r.diffs.length > 0);
if (allDiffs.length) {
  console.error(
    "STOP: live state differs from approved expected-pre.json — will NOT rewrite expectations.",
  );
  for (const r of allDiffs) {
    console.error(`\n[${r.label}] ${r.sku}:`);
    for (const d of r.diffs) {
      console.error(
        `  ${d.field}:\n    live:     ${JSON.stringify(d.live)}\n    expected: ${JSON.stringify(d.expected)}`,
      );
    }
  }
  process.exit(1);
}

console.log(
  "OK: live matches approved expected-pre.json for all three products. Safe to consider activate.sql guards.",
);
process.exit(0);
