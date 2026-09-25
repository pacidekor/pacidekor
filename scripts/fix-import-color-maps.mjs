/**
 * Re-assign color_image_map for IMP-NEJ-* products by matching
 * dominant image color (excludes studio green background) to color ids.
 *
 * Usage:
 *   node scripts/fix-import-color-maps.mjs --dry-run
 *   node scripts/fix-import-color-maps.mjs
 *   node scripts/fix-import-color-maps.mjs --only IMP-NEJ-020
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

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
  const args = { dryRun: false, only: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--dry-run") args.dryRun = true;
    else if (argv[i] === "--only") args.only = argv[++i];
  }
  return args;
}

const FILTER_HEX = {
  biela: "#f5f2ec",
  cervena: "#b43c3c",
  ruzova: "#d4a0a8",
  fialova: "#7a5f8a",
  zelena: "#6b7f5a",
  kremova: "#e8d9c4",
  oranzova: "#d4894a",
  zlta: "#e0c35a",
  modra: "#5a7a9a",
  hneda: "#8a6a4a",
  seda: "#9a9a96",
};

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function colorIdToTargetRgb(colorId) {
  if (FILTER_HEX[colorId]) return hexToRgb(FILTER_HEX[colorId]);
  if (colorId.startsWith("custom:")) {
    const raw = colorId.slice("custom:".length);
    const sep = raw.indexOf(":");
    const hexPart = sep === -1 ? raw : raw.slice(0, sep);
    const solid = hexPart.split("-")[0];
    if (/^[0-9a-fA-F]{6}$/.test(solid)) return hexToRgb(`#${solid}`);
  }
  return null;
}

function rgbDist(a, b) {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function isBackgroundPixel(r, g, b) {
  // Studio olive / sage green backdrop used in product shots
  const isOlive =
    g > r + 8 && g > b + 5 && g > 90 && g < 190 && r > 70 && r < 170;
  // Near-white / near-black edges rarely product on these shots — keep them
  // Only exclude olive-like bg
  return isOlive;
}

async function analyzeImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());

  // Center crop — ribbons sit in the middle; corners are mostly backdrop
  const meta = await sharp(buf).metadata();
  const w = meta.width || 800;
  const h = meta.height || 800;
  const side = Math.floor(Math.min(w, h) * 0.55);
  const left = Math.floor((w - side) / 2);
  const top = Math.floor((h - side) / 2);

  const { data, info } = await sharp(buf)
    .extract({ left, top, width: side, height: side })
    .resize(48, 48, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const samples = [];
  const hueBuckets = new Map();

  for (let i = 0; i < data.length; i += 3) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (isBackgroundPixel(r, g, b)) continue;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max < 30 || min > 248) continue;

    const hsl = rgbToHsl(r, g, b);
    samples.push({ r, g, b, ...hsl });

    if (hsl.s > 0.12) {
      const bucket = Math.round(hsl.h / 30) % 12;
      hueBuckets.set(bucket, (hueBuckets.get(bucket) || 0) + 1);
    }
  }

  if (samples.length === 0) {
    return {
      avg: { r: 128, g: 128, b: 128 },
      hsl: { h: 0, s: 0, l: 0.5 },
      isGroup: false,
      productPixels: 0,
    };
  }

  const avg = {
    r: samples.reduce((s, p) => s + p.r, 0) / samples.length,
    g: samples.reduce((s, p) => s + p.g, 0) / samples.length,
    b: samples.reduce((s, p) => s + p.b, 0) / samples.length,
  };
  const hsl = rgbToHsl(avg.r, avg.g, avg.b);
  // Only treat as group overview when many distinct hues — single ribbons
  // can look "varied" due to shadows/satin gloss.
  const significantHues = [...hueBuckets.values()].filter(
    (c) => c > samples.length * 0.12,
  ).length;
  const isGroup = significantHues >= 4;

  return { avg, hsl, isGroup, productPixels: samples.length };
}

function rgbToHsl(r, g, b) {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rr) h = ((gg - bb) / d + (gg < bb ? 6 : 0)) * 60;
  else if (max === gg) h = ((bb - rr) / d + 2) * 60;
  else h = ((rr - gg) / d + 4) * 60;
  return { h, s, l };
}

function colorDistance(sample, targetRgb) {
  const tHsl = rgbToHsl(targetRgb.r, targetRgb.g, targetRgb.b);
  const sHsl = sample.hsl;

  // Neutrals (cream/white/beige/black/silver): lightness + low sat matter more
  if (tHsl.s < 0.25) {
    const dl = (sHsl.l - tHsl.l) * 220;
    const ds = (sHsl.s - tHsl.s) * 120;
    const rgb = rgbDist(sample.avg, targetRgb) * 0.35;
    return Math.sqrt(dl * dl + ds * ds) + rgb;
  }

  // Chromatic: hue weighted heavily
  let dh = Math.abs(sHsl.h - tHsl.h);
  if (dh > 180) dh = 360 - dh;
  const dl = (sHsl.l - tHsl.l) * 80;
  const ds = (sHsl.s - tHsl.s) * 60;
  return dh * 1.8 + Math.sqrt(dl * dl + ds * ds);
}

function buildMap(colorIds, analyses) {
  const map = {};
  const singleIndexes = analyses
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => !a.isGroup);

  const candidates =
    singleIndexes.length > 0
      ? singleIndexes
      : analyses.map((a, i) => ({ a, i }));

  // Hungarian-ish greedy: assign best unique pairs sorted by confidence
  const pairs = [];
  for (const colorId of colorIds) {
    const target = colorIdToTargetRgb(colorId);
    if (!target) continue;
    for (const { a, i } of candidates) {
      pairs.push({
        colorId,
        index: i,
        dist: colorDistance(a, target),
      });
    }
  }
  pairs.sort((x, y) => x.dist - y.dist);

  const usedColors = new Set();
  const usedImages = new Set();
  for (const p of pairs) {
    if (usedColors.has(p.colorId) || usedImages.has(p.index)) continue;
    map[p.colorId] = [p.index];
    usedColors.add(p.colorId);
    usedImages.add(p.index);
  }

  // leftovers without target hex or unmatched
  for (const colorId of colorIds) {
    if (map[colorId]) continue;
    const free = candidates.find(({ i }) => !usedImages.has(i));
    if (free) {
      map[colorId] = [free.i];
      usedImages.add(free.i);
    } else {
      map[colorId] = [candidates[0]?.i ?? 0];
    }
  }

  return map;
}

function mapsEqual(a, b) {
  return JSON.stringify(a || {}) === JSON.stringify(b || {});
}

async function main() {
  const args = parseArgs(process.argv);
  const env = loadEnv();
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  let query = supabase
    .from("products")
    .select("id, name, sku, color_ids, images, color_image_map")
    .like("sku", "IMP-NEJ-%")
    .order("sku");

  if (args.only) query = query.eq("sku", args.only);

  const { data: products, error } = await query;
  if (error) throw error;

  console.log(
    `Fixing color maps for ${products.length} products${args.dryRun ? " (DRY RUN)" : ""}…`,
  );

  let changed = 0;
  let skipped = 0;
  let failed = 0;

  for (const p of products) {
    const colors = p.color_ids || [];
    const images = p.images || [];
    if (colors.length === 0 || images.length === 0) {
      skipped++;
      continue;
    }
    // single color + single image — trivial
    if (colors.length === 1 && images.length === 1) {
      const next = { [colors[0]]: [0] };
      if (mapsEqual(p.color_image_map, next)) {
        skipped++;
        continue;
      }
      if (!args.dryRun) {
        const { error: up } = await supabase
          .from("products")
          .update({ color_image_map: next })
          .eq("id", p.id);
        if (up) throw up;
      }
      console.log(`${p.sku} trivial → ${JSON.stringify(next)}`);
      changed++;
      continue;
    }

    try {
      const analyses = [];
      for (const url of images) {
        analyses.push(await analyzeImage(url));
      }
      // Typical packshot: first frame is multi-color overview
      if (images.length >= colors.length + 1) {
        analyses[0].isGroup = true;
      } else {
        // Don't trust auto group flags when we need every frame
        for (const a of analyses) a.isGroup = false;
      }
      const next = buildMap(colors, analyses);

      if (mapsEqual(p.color_image_map, next)) {
        skipped++;
        continue;
      }

      console.log(
        `${p.sku} ${p.name}\n  old ${JSON.stringify(p.color_image_map)}\n  new ${JSON.stringify(next)}\n  avgs ${analyses
          .map(
            (a, i) =>
              `#${i}${a.isGroup ? "G" : ""} rgb(${a.avg.r.toFixed(0)},${a.avg.g.toFixed(0)},${a.avg.b.toFixed(0)})`,
          )
          .join(" | ")}`,
      );

      if (!args.dryRun) {
        const { error: up } = await supabase
          .from("products")
          .update({ color_image_map: next })
          .eq("id", p.id);
        if (up) throw up;
      }
      changed++;
    } catch (err) {
      console.error(`${p.sku} FAIL`, err.message || err);
      failed++;
    }
  }

  console.log(`\nDone. changed=${changed} skipped=${skipped} failed=${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
