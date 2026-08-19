/**
 * One-time migration: dedupe custom color IDs across products.
 * Usage: node scripts/migrate-custom-colors.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const path = resolve(process.cwd(), ".env.local");
  const raw = readFileSync(path, "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, "");
  }
  return env;
}

const CUSTOM_COLOR_PREFIX = "custom:";

function normalizeHex(hex) {
  const value = hex.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(value)) return `#${value.toLowerCase()}`;
  return "#9a9a96";
}

function normalizeColorLabel(label) {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function parseCustomColorId(id) {
  if (!id.startsWith(CUSTOM_COLOR_PREFIX)) return null;
  const raw = id.slice(CUSTOM_COLOR_PREFIX.length);
  const sep = raw.indexOf(":");
  if (sep === -1) return null;
  const hexPart = raw.slice(0, sep);
  const label = decodeURIComponent(raw.slice(sep + 1)).trim();
  if (!label) return null;

  const splitMatch = /^([0-9a-fA-F]{6})-([0-9a-fA-F]{6})$/.exec(hexPart);
  if (splitMatch) {
    return {
      id,
      label,
      hex: `#${splitMatch[1].toLowerCase()}`,
      hexSecondary: `#${splitMatch[2].toLowerCase()}`,
    };
  }
  if (!/^[0-9a-fA-F]{6}$/.test(hexPart)) return null;
  return { id, label, hex: `#${hexPart.toLowerCase()}` };
}

function customColorGroupKey(id) {
  const parsed = parseCustomColorId(id);
  if (!parsed) return null;
  const labelKey = normalizeColorLabel(parsed.label);
  if (parsed.hexSecondary) {
    const [a, b] = [parsed.hex.slice(1), parsed.hexSecondary.slice(1)].sort();
    return `${labelKey}|${a}-${b}`;
  }
  return labelKey;
}

function buildMigrationMap(colorUsage) {
  const groups = new Map();
  for (const [id, count] of colorUsage) {
    if (!id.startsWith(CUSTOM_COLOR_PREFIX)) continue;
    const groupKey = customColorGroupKey(id);
    if (!groupKey) continue;
    const bucket = groups.get(groupKey) ?? [];
    bucket.push({ id, count });
    groups.set(groupKey, bucket);
  }

  const migration = new Map();
  for (const entries of groups.values()) {
    const canonical = [...entries].sort(
      (a, b) => b.count - a.count || a.id.localeCompare(b.id, "sk"),
    )[0].id;
    for (const entry of entries) migration.set(entry.id, canonical);
  }
  return migration;
}

function migrateProduct(row, migration) {
  const colorIds = row.color_ids ?? [];
  const colorImageMap = row.color_image_map ?? {};
  const nextIds = [];
  const nextMap = {};

  for (const id of colorIds) {
    const mapped = migration.get(id) ?? id;
    if (!nextIds.includes(mapped)) nextIds.push(mapped);
  }

  for (const [key, indexes] of Object.entries(colorImageMap)) {
    const mapped = migration.get(key) ?? key;
    const merged = [...(nextMap[mapped] ?? []), ...(indexes ?? [])];
    nextMap[mapped] = [...new Set(merged)].sort((a, b) => a - b);
  }

  const changed =
    JSON.stringify(colorIds) !== JSON.stringify(nextIds) ||
    JSON.stringify(colorImageMap) !== JSON.stringify(nextMap);

  return changed ? { color_ids: nextIds, color_image_map: nextMap } : null;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const supabase = createClient(url, key);

const { data: products, error } = await supabase
  .from("products")
  .select("id, sku, color_ids, color_image_map");

if (error) {
  console.error(error.message);
  process.exit(1);
}

const colorUsage = new Map();
for (const product of products ?? []) {
  const seen = new Set();
  for (const id of product.color_ids ?? []) {
    if (!id.startsWith(CUSTOM_COLOR_PREFIX) || seen.has(id)) continue;
    seen.add(id);
    colorUsage.set(id, (colorUsage.get(id) ?? 0) + 1);
  }
}

const migration = buildMigrationMap(colorUsage);
const remapped = [...migration.entries()].filter(([from, to]) => from !== to);

console.log(`Products: ${products?.length ?? 0}`);
console.log(`Unique custom colors: ${colorUsage.size}`);
console.log(`IDs to remap: ${remapped.length}`);

for (const [from, to] of remapped.sort((a, b) => a[0].localeCompare(b[0], "sk"))) {
  const parsed = parseCustomColorId(from);
  console.log(`  ${parsed?.label ?? "?"}: ${from} -> ${to}`);
}

let updated = 0;
for (const product of products ?? []) {
  const patch = migrateProduct(product, migration);
  if (!patch) continue;

  const { error: updateError } = await supabase
    .from("products")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", product.id);

  if (updateError) {
    console.error(`Failed ${product.sku}:`, updateError.message);
    process.exit(1);
  }
  updated += 1;
}

console.log(`Updated products: ${updated}`);

for (const table of ["cart_items", "order_items"]) {
  const { data: rows, error: rowsError } = await supabase
    .from(table)
    .select("id, color_id")
    .not("color_id", "is", null);

  if (rowsError) {
    console.warn(`Skip ${table}:`, rowsError.message);
    continue;
  }

  let tableUpdates = 0;
  for (const row of rows ?? []) {
    const mapped = migration.get(row.color_id);
    if (!mapped || mapped === row.color_id) continue;
    const { error: updateError } = await supabase
      .from(table)
      .update({ color_id: mapped })
      .eq("id", row.id);
    if (updateError) {
      console.error(`${table} ${row.id}:`, updateError.message);
      continue;
    }
    tableUpdates += 1;
  }
  console.log(`Updated ${table}: ${tableUpdates}`);
}

console.log("Done.");
