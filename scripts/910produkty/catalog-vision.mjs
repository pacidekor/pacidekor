/**
 * Vision catalog for public/910produkty → catalog.json (Claude)
 *
 * Usage:
 *   node scripts/910produkty/catalog-vision.mjs --dry-run --limit 3
 *   node scripts/910produkty/catalog-vision.mjs
 *   node scripts/910produkty/catalog-vision.mjs --only 12,45
 *   node scripts/910produkty/catalog-vision.mjs --concurrency 3
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const ROOT = path.resolve(".");
const INV_PATH = path.join(ROOT, "scripts/910produkty/inventory.json");
const OUT_PATH = path.join(ROOT, "scripts/910produkty/catalog.json");
const PROGRESS_PATH = path.join(
  ROOT,
  "scripts/910produkty/_catalog-progress.json",
);

const CATEGORIES = [
  "Umelé kvety",
  "Sušina",
  "Stuhy",
  "Aranž. materiál",
  "Obalový materiál",
  "Keramika",
  "Vencové základy",
  "Košíky",
  "Svietniky",
  "Flowerboxy",
];

const COLOR_HINTS = [
  "biela",
  "krémová",
  "červená",
  "ružová",
  "staroružová",
  "fialová",
  "zelená",
  "oranžová",
  "žltá",
  "modrá",
  "hnedá",
  "sivá",
  "bordová",
  "zlatá",
  "strieborná",
  "béžová",
  "prírodná",
  "čierna",
  "broskyňová",
];

function loadEnv() {
  const env = {};
  for (const line of fs
    .readFileSync(path.join(ROOT, ".env.local"), "utf8")
    .split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    limit: null,
    only: null,
    concurrency: 3,
    force: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--force") args.force = true;
    else if (a === "--limit") args.limit = Number(argv[++i]);
    else if (a === "--concurrency") args.concurrency = Number(argv[++i]) || 3;
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

function productKey(p) {
  return `${p.batch}::${p.group || ""}::${p.folder}`;
}

function hintFromFolder(folder) {
  const f = folder.toLowerCase();
  const hints = [];
  if (f.includes("kytica") || f.includes("kytice")) hints.push("kytica");
  if (f.includes("pivonk")) hints.push("pivónia");
  if (f.includes("ruza") || f.includes("ruža")) hints.push("ruža");
  if (f.includes("dalia") || f.includes("dália")) hints.push("dália");
  if (f.includes("ranunk")) hints.push("ranunkulus");
  if (f.includes("hortenz")) hints.push("hortenzia");
  if (f.includes("protea")) hints.push("protea");
  if (f.includes("hrebic") || f.includes("hrebíč")) hints.push("klinček");
  if (f.includes("jucca") || f.includes("yucca")) hints.push("juka");
  if (f.includes("stopkov")) hints.push("stopkový kvet");
  if (f.includes("video") || f.includes("krb")) hints.push("dekoratívny krb");
  const code = folder.match(/\b([A-Z]{1,3}\d{2,5}|\d{2,4})\b/);
  if (code) hints.push(`kód/označenie: ${code[1]}`);
  return hints.join(", ");
}

async function makeThumb(srcPath, maxSide = 768) {
  return sharp(srcPath)
    .rotate()
    .resize({
      width: maxSide,
      height: maxSide,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 72, mozjpeg: true })
    .toBuffer();
}

function pickImageIndices(count) {
  if (count <= 0) return [];
  if (count === 1) return [0];
  if (count === 2) return [0, 1];
  if (count <= 4) return Array.from({ length: count }, (_, i) => i);
  return [
    ...new Set([
      0,
      Math.floor((count - 1) / 3),
      Math.floor((2 * (count - 1)) / 3),
      count - 1,
    ]),
  ].sort((a, b) => a - b);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function catalogOne({ apiKey, product, index, total }) {
  const imgs = product.images;
  const indices = pickImageIndices(imgs.length);

  const content = [
    {
      type: "text",
      text: `Si slovenský produktový katalogizátor pre veľkoobchod s aranžérskym materiálom PACIDEKOR.

Úloha: identifikuj produkt z fotiek a vráť IBA platný JSON objekt (bez markdown).

Kontext:
- zdrojová zložka: ${product.folder}
- dávka: ${product.batch}${product.group ? ` / ${product.group}` : ""}
- počet fotiek celkom: ${imgs.length}
- tip zo zložky: ${hintFromFolder(product.folder) || "žiadny"}
- videá v zložke: ${product.videos?.length ? product.videos.join(", ") : "nie"}
- posielam náhľady fotiek s indexmi 1-based: ${indices.map((i) => i + 1).join(", ")}

Pravidlá:
- Názov slovensky, obchodný, bez em-dash, max ~70 znakov.
- Popis 1–2 vety, slovensky, bez farby a bez počtu kusov (farby patria do groups).
- category MUSÍ byť jedna z: ${CATEGORIES.join(" | ")}
- subcategory podľa produktu (napr. Kytice, Stopkové kvety, Doplnky, ...), alebo "".
- druh: typ kvetu/produktu (Pivónia, Ruža, Dália, ...) alebo "".
- groups: farebné varianty. color = krátky slovenský názov farby (malé písmená, tipy: ${COLOR_HINTS.join(", ")}).
- photos v groups = 1-based indexy do CELEJ galérie (1..${imgs.length}), nie len poslaných náhľadov.
- Ak je 1 farba, daj všetky fotky do jednej group.
- Ak vidíš viac farieb, rozdeľ fotky podľa farieb.
- confidence: 0–1.

JSON schema:
{"name":"string","description":"string","category":"string","subcategory":"string","druh":"string","groups":[{"color":"string","photos":[1,2]}],"confidence":0.0,"notes":"string"}`,
    },
  ];

  for (const i of indices) {
    const src = path.join(product.path, imgs[i]);
    const buf = await makeThumb(src);
    content.push({
      type: "text",
      text: `Foto ${i + 1}/${imgs.length}:`,
    });
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: "image/jpeg",
        data: buf.toString("base64"),
      },
    });
  }

  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 900,
          temperature: 0.2,
          messages: [{ role: "user", content }],
        }),
      });

      if (res.status === 429 || res.status >= 500) {
        const wait = attempt * 2500;
        const t = await res.text();
        console.warn(`[${index}] retry ${attempt} after ${res.status}: ${t.slice(0, 120)}`);
        await sleep(wait);
        continue;
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Anthropic ${res.status}: ${errText.slice(0, 400)}`);
      }

      const data = await res.json();
      const raw = (data.content || [])
        .filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("\n")
        .trim();

      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error(`No JSON in response: ${raw.slice(0, 200)}`);
      const parsed = JSON.parse(jsonMatch[0]);

      const allPhotos = Array.from({ length: imgs.length }, (_, i) => i + 1);
      let groups = Array.isArray(parsed.groups) ? parsed.groups : [];
      groups = groups
        .map((g) => ({
          color: String(g.color || "")
            .trim()
            .toLowerCase(),
          photos: (Array.isArray(g.photos) ? g.photos : [])
            .map(Number)
            .filter((n) => n >= 1 && n <= imgs.length),
        }))
        .filter((g) => g.color && g.photos.length);

      if (groups.length === 0) {
        groups = [{ color: "prírodná", photos: allPhotos }];
      }

      const covered = new Set(groups.flatMap((g) => g.photos));
      const missing = allPhotos.filter((n) => !covered.has(n));
      if (missing.length) {
        groups[0].photos = [...new Set([...groups[0].photos, ...missing])].sort(
          (a, b) => a - b,
        );
      }

      const category = CATEGORIES.includes(parsed.category)
        ? parsed.category
        : "Umelé kvety";

      const entry = {
        id: index,
        sourceKey: productKey(product),
        sourceFolder: product.folder,
        sourcePath: product.path,
        batch: product.batch,
        group: product.group,
        imageCount: imgs.length,
        videos: product.videos || [],
        name: String(parsed.name || product.folder).trim(),
        description: String(parsed.description || "").trim(),
        category,
        subcategory: String(parsed.subcategory || "").trim(),
        druh: String(parsed.druh || "").trim(),
        groups,
        confidence: Number(parsed.confidence) || 0,
        notes: String(parsed.notes || "").trim(),
      };

      console.log(
        `[${index}/${total}] ${entry.name} | ${entry.category}/${entry.subcategory || "-"} | farby: ${groups.map((g) => g.color).join(", ")} | conf ${entry.confidence}`,
      );
      return entry;
    } catch (err) {
      lastErr = err;
      if (attempt < 4) await sleep(attempt * 2000);
    }
  }
  throw lastErr;
}

async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

async function main() {
  const args = parseArgs(process.argv);
  const env = loadEnv();
  if (!env.ANTHROPIC_API_KEY) {
    console.error("Missing ANTHROPIC_API_KEY in .env.local");
    process.exit(1);
  }

  const inventory = JSON.parse(fs.readFileSync(INV_PATH, "utf8")).filter(
    (p) => p.images.length > 0,
  );

  inventory.sort((a, b) => {
    const ka = `${a.batch}|${a.group || ""}|${a.folder}`;
    const kb = `${b.batch}|${b.group || ""}|${b.folder}`;
    return ka.localeCompare(kb, "sk", { numeric: true });
  });

  let progress = { done: {} };
  if (fs.existsSync(PROGRESS_PATH) && !args.force) {
    try {
      progress = JSON.parse(fs.readFileSync(PROGRESS_PATH, "utf8"));
    } catch {
      progress = { done: {} };
    }
  }

  let items = inventory.map((p, i) => ({ product: p, id: i + 1 }));
  if (args.only) items = items.filter((x) => args.only.has(x.id));
  if (args.limit) items = items.slice(0, args.limit);

  console.log(
    `Cataloging ${items.length} products (concurrency ${args.concurrency})${args.dryRun ? " DRY RUN" : ""}…`,
  );

  if (args.dryRun) {
    for (const { product, id } of items.slice(0, 15)) {
      console.log(
        `#${id}`,
        productKey(product),
        "imgs",
        product.images.length,
        "hint",
        hintFromFolder(product.folder),
      );
    }
    return;
  }

  await mapPool(items, args.concurrency, async ({ product, id }) => {
    const key = productKey(product);
    if (progress.done[key] && !args.force) {
      console.log(`[${id}] skip ${key}`);
      return progress.done[key];
    }
    try {
      const entry = await catalogOne({
        apiKey: env.ANTHROPIC_API_KEY,
        product,
        index: id,
        total: inventory.length,
      });
      progress.done[key] = entry;
      fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2), "utf8");
      return entry;
    } catch (err) {
      console.error(`[${id}] FAIL ${key}:`, err.message || err);
      return null;
    }
  });

  const catalog = inventory
    .map((p, i) => {
      const key = productKey(p);
      const entry = progress.done[key];
      if (!entry) return null;
      return { ...entry, id: i + 1 };
    })
    .filter(Boolean);

  fs.writeFileSync(OUT_PATH, JSON.stringify(catalog, null, 2), "utf8");
  console.log(`Wrote ${catalog.length}/${inventory.length} → ${OUT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
