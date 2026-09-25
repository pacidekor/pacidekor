/**
 * Bulk import public/249produkty-ready → Supabase products + Storage.
 * SKU prefix: IMP-249- (filterable vs IMP-NEJ-).
 *
 * Usage:
 *   node scripts/import-249produkty.mjs --dry-run
 *   node scripts/import-249produkty.mjs --limit 3
 *   node scripts/import-249produkty.mjs
 *   node scripts/import-249produkty.mjs --only 2,35
 */
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = resolve("public/249produkty-ready");
const BUCKET = "product-images";
const SKU_PREFIX = "IMP-249";
const STORAGE_PREFIX = "bulk-249";
const NEW_PRODUCT_DAYS = 60;
const PROGRESS_PATH = resolve(ROOT, "_import-progress.json");

function loadEnv() {
  const path = resolve(process.cwd(), ".env.local");
  const raw = readFileSync(path, "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

function parseArgs(argv) {
  const args = { dryRun: false, limit: null, only: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--limit") args.limit = Number(argv[++i]);
    else if (a === "--only") {
      args.only = new Set(
        argv[++i]
          .split(",")
          .map((s) => Number(s.trim()))
          .filter(Boolean),
      );
    }
  }
  return args;
}

function toSlug(label) {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function encodeCustomColorId(hex, label) {
  const clean = hex.replace(/^#/, "").toLowerCase();
  return `custom:${clean}:${encodeURIComponent(label)}`;
}

const COLOR_MAP = {
  biela: "biela",
  bílá: "biela",
  čierna: encodeCustomColorId("1a1a1a", "Čierna"),
  cierna: encodeCustomColorId("1a1a1a", "Čierna"),
  červená: "cervena",
  cervena: "cervena",
  ružová: "ruzova",
  ruzova: "ruzova",
  staroružová: encodeCustomColorId("d4a0a8", "Staroružová"),
  staroruzova: encodeCustomColorId("d4a0a8", "Staroružová"),
  fialová: "fialova",
  fialova: "fialova",
  zelená: "zelena",
  zelena: "zelena",
  krémová: "kremova",
  kremova: "kremova",
  oranžová: "oranzova",
  oranzova: "oranzova",
  žltá: "zlta",
  zlta: "zlta",
  modrá: "modra",
  modra: "modra",
  hnedá: "hneda",
  hneda: "hneda",
  sivá: "seda",
  seda: "seda",
  šedá: "seda",
  zlatá: encodeCustomColorId("c9a227", "Zlatá"),
  zlata: encodeCustomColorId("c9a227", "Zlatá"),
  strieborná: encodeCustomColorId("c0c0c0", "Strieborná"),
  strieborna: encodeCustomColorId("c0c0c0", "Strieborná"),
  bordová: encodeCustomColorId("6b2d3c", "Bordová"),
  bordova: encodeCustomColorId("6b2d3c", "Bordová"),
  prírodná: encodeCustomColorId("c4a574", "Prírodná"),
  prirodna: encodeCustomColorId("c4a574", "Prírodná"),
  číra: encodeCustomColorId("e8eef2", "Číra"),
  cira: encodeCustomColorId("e8eef2", "Číra"),
  béžová: encodeCustomColorId("d9c3a5", "Béžová"),
  bezova: encodeCustomColorId("d9c3a5", "Béžová"),
  tyrkysová: encodeCustomColorId("4aa3a2", "Tyrkysová"),
  vínová: encodeCustomColorId("6b2d3c", "Vínová"),
  vinova: encodeCustomColorId("6b2d3c", "Vínová"),
  modrozelená: encodeCustomColorId("2f6f6a", "Modrozelená"),
  modrozelena: encodeCustomColorId("2f6f6a", "Modrozelená"),
  medená: encodeCustomColorId("b87333", "Medená"),
  medena: encodeCustomColorId("b87333", "Medená"),
  olivová: encodeCustomColorId("6b7c3a", "Olivová"),
  olivova: encodeCustomColorId("6b7c3a", "Olivová"),
  okrová: encodeCustomColorId("c4a35a", "Okrová"),
  okrova: encodeCustomColorId("c4a35a", "Okrová"),
};

function mapColor(label) {
  const key = String(label || "")
    .trim()
    .toLowerCase();
  if (!key) return null;
  if (COLOR_MAP[key]) return COLOR_MAP[key];
  return encodeCustomColorId(
    "9a9a96",
    label.trim().replace(/^./, (c) => c.toUpperCase()),
  );
}

const SUB_ALIASES = {
  "dekoratívne stuhy": "ozdobne-stuhy",
  "dekoračné stuhy": "ozdobne-stuhy",
  "ozdobné stuhy": "ozdobne-stuhy",
  "smútočné stuhy": "pohrebne-stuhy",
  "pohrebné stuhy": "pohrebne-stuhy",
  "zamatové stuhy": "sametove-stuhy",
  "sametové stuhy": "sametove-stuhy",
  čipky: "cipkove-stuhy",
  "čipkové stuhy": "cipkove-stuhy",
  "čipkované stuhy": "cipkove-stuhy",
  vence: "vencovky",
  venčovky: "vencovky",
  zeleň: "doplnky",
  srdce: "flowerboxy-srdce",
  okrúhle: "flowerboxy-okruhle",
  "tašky na kvety": "flowerboxy-tasky-na-kvety",
  hranaté: "flowerboxy-hranate",
  štvorcové: "flowerboxy-stvorcove",
  semišové: "flowerboxy-semisove",
};

function resolveSubcategoryId(categoryLabel, subcategoryLabel, byCategoryLabel) {
  if (!subcategoryLabel) return null;
  const catMap = byCategoryLabel.get(categoryLabel) || new Map();
  const raw = subcategoryLabel.trim();
  const lower = raw.toLowerCase();

  if (catMap.has(lower)) return catMap.get(lower);

  let alias = SUB_ALIASES[lower];
  if (lower === "špagáty" || lower === "spagaty") {
    alias =
      categoryLabel === "Stuhy" ? "dekoračne-snury" : "spagaty-a-snury";
  }
  if (alias && [...catMap.values()].includes(alias)) return alias;
  if (alias) return alias;

  for (const [label, id] of catMap) {
    if (label.includes(lower) || lower.includes(label)) return id;
  }
  return null;
}

function listWebps(dir) {
  return readdirSync(dir)
    .filter((f) => /^\d+\.webp$/i.test(f))
    .sort((a, b) => Number(a.replace(/\D/g, "")) - Number(b.replace(/\D/g, "")));
}

function buildColorImageMap(colorIds, imageCount) {
  if (!colorIds.length || imageCount === 0) return {};
  if (imageCount === colorIds.length + 1) {
    const map = {};
    colorIds.forEach((id, i) => {
      map[id] = [i + 1];
    });
    return map;
  }
  if (imageCount === colorIds.length) {
    const map = {};
    colorIds.forEach((id, i) => {
      map[id] = [i];
    });
    return map;
  }
  const all = Array.from({ length: imageCount }, (_, i) => i);
  const map = {};
  for (const id of colorIds) map[id] = all;
  return map;
}

function computeNewUntil() {
  const d = new Date();
  d.setDate(d.getDate() + NEW_PRODUCT_DAYS);
  return d.toISOString();
}

function loadProgress() {
  if (!existsSync(PROGRESS_PATH)) return { done: {} };
  try {
    return JSON.parse(readFileSync(PROGRESS_PATH, "utf8"));
  } catch {
    return { done: {} };
  }
}

function saveProgress(progress) {
  writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2), "utf8");
}

async function uniqueSlug(supabase, base) {
  const root = base || "novy-produkt";
  let slug = root;
  let suffix = 2;
  for (;;) {
    const { data } = await supabase
      .from("products")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
    slug = `${root}-${suffix}`;
    suffix += 1;
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const catalog = JSON.parse(readFileSync(join(ROOT, "catalog.json"), "utf8"));

  const { data: categories, error: catErr } = await supabase
    .from("categories")
    .select("id, label");
  if (catErr) throw catErr;
  const { data: subcategories, error: subErr } = await supabase
    .from("subcategories")
    .select("id, category_id, label");
  if (subErr) throw subErr;

  const catLabelById = new Map(categories.map((c) => [c.id, c.label]));
  const byCategoryLabel = new Map();
  for (const s of subcategories) {
    const catLabel = catLabelById.get(s.category_id);
    if (!catLabel) continue;
    if (!byCategoryLabel.has(catLabel)) byCategoryLabel.set(catLabel, new Map());
    byCategoryLabel.get(catLabel).set(s.label.toLowerCase(), s.id);
  }

  let items = catalog.slice().sort((a, b) => a.id - b.id);
  if (args.only) items = items.filter((p) => args.only.has(p.id));
  if (args.limit) items = items.slice(0, args.limit);

  const progress = loadProgress();
  let ok = 0;
  let skipped = 0;
  let failed = 0;

  console.log(
    `Import ${items.length} products as ${SKU_PREFIX}-*${args.dryRun ? " (DRY RUN)" : ""}…`,
  );

  for (const product of items) {
    const sku = `${SKU_PREFIX}-${String(product.id).padStart(3, "0")}`;
    if (progress.done[sku]) {
      console.log(`#${product.id} skip (already imported ${progress.done[sku]})`);
      skipped++;
      continue;
    }

    const folderName =
      product.readyFolder || product.sourceFolder || String(product.id);
    const dir = join(ROOT, folderName);
    if (!existsSync(dir)) {
      console.error(`#${product.id} missing folder ${folderName}`);
      failed++;
      continue;
    }

    const webps = listWebps(dir);
    if (webps.length === 0) {
      console.error(`#${product.id} no webp in ${folderName}`);
      failed++;
      continue;
    }

    const category = product.category;
    if (!categories.some((c) => c.label === category)) {
      console.error(`#${product.id} unknown category "${category}"`);
      failed++;
      continue;
    }

    const subcategoryId = resolveSubcategoryId(
      category,
      product.subcategory,
      byCategoryLabel,
    );
    if (product.subcategory && !subcategoryId) {
      console.warn(
        `#${product.id} subcategory "${product.subcategory}" not mapped — inserting null`,
      );
    }

    const colorIds = [
      ...new Set((product.colors || []).map(mapColor).filter(Boolean)),
    ];
    const colorImageMap = buildColorImageMap(colorIds, webps.length);
    const slugBase = toSlug(product.name);
    const name = product.name.trim();
    const description = (product.description || "").trim();

    console.log(
      `#${product.id} ${name} | ${category}/${subcategoryId || "—"} | colors ${colorIds.length} | imgs ${webps.length}`,
    );

    if (args.dryRun) {
      ok++;
      continue;
    }

    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .eq("sku", sku)
      .maybeSingle();
    if (existing) {
      progress.done[sku] = existing.id;
      saveProgress(progress);
      console.log(`#${product.id} skip DB sku exists ${existing.id}`);
      skipped++;
      continue;
    }

    try {
      const imageUrls = [];
      for (const file of webps) {
        const buf = readFileSync(join(dir, file));
        const hash = createHash("sha1").update(buf).digest("hex").slice(0, 12);
        const path = `${STORAGE_PREFIX}/${product.id}/${hash}-${file}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, buf, {
            contentType: "image/webp",
            upsert: true,
            cacheControl: "31536000",
          });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
        imageUrls.push(pub.publicUrl);
      }

      const slug = await uniqueSlug(supabase, slugBase);
      const payload = {
        slug,
        name,
        description,
        sku,
        price: "0,00 €",
        original_price: null,
        discount: null,
        category,
        subcategory_id: subcategoryId,
        druh_id: null,
        color_ids: colorIds,
        color_image_map: colorImageMap,
        packaging: [],
        details: [],
        images: imageUrls,
        in_stock: true,
        stock_quantity: null,
        is_new: true,
        new_until: computeNewUntil(),
        in_vypredaj: false,
        is_bestseller: false,
      };

      const { data: inserted, error: insErr } = await supabase
        .from("products")
        .insert(payload)
        .select("id")
        .single();
      if (insErr) throw insErr;

      progress.done[sku] = inserted.id;
      saveProgress(progress);
      console.log(`#${product.id} OK → ${inserted.id} (${slug})`);
      ok++;
    } catch (err) {
      console.error(`#${product.id} FAIL`, err.message || err);
      failed++;
    }
  }

  console.log(`\nDone. ok=${ok} skipped=${skipped} failed=${failed}`);
  if (args.dryRun) console.log("(dry-run — nothing written)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
