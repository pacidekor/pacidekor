/**
 * Split multi-color import products into confident vs needs-review.
 * Compares current (vision) map with RGB/HSL rematch + risk heuristics.
 *
 * Usage:
 *   node scripts/rank-color-map-confidence.mjs
 *   node scripts/rank-color-map-confidence.mjs --prefix IMP-249 --out public/249produkty-ready
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

function parseArgs(argv) {
  const args = {
    prefix: "IMP-NEJ",
    out: "public/nejnovejsiprodukty-ready",
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--prefix") args.prefix = argv[++i];
    else if (argv[i] === "--out") args.out = argv[++i];
  }
  return args;
}

function loadEnv() {
  const env = {};
  for (const line of readFileSync(resolve(".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

function colorLabel(id) {
  const labels = {
    biela: "biela",
    cervena: "červená",
    ruzova: "ružová",
    fialova: "fialová",
    zelena: "zelená",
    kremova: "krémová",
    oranzova: "oranžová",
    zlta: "žltá",
    modra: "modrá",
    hneda: "hnedá",
    seda: "sivá",
  };
  if (labels[id]) return labels[id];
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

function rgbDist(a, b) {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function isBackgroundPixel(r, g, b) {
  return g > r + 8 && g > b + 5 && g > 90 && g < 190 && r > 70 && r < 170;
}

function colorDistance(sample, targetRgb) {
  const tHsl = rgbToHsl(targetRgb.r, targetRgb.g, targetRgb.b);
  const sHsl = sample.hsl;
  if (tHsl.s < 0.25) {
    const dl = (sHsl.l - tHsl.l) * 220;
    const ds = (sHsl.s - tHsl.s) * 120;
    const rgb = rgbDist(sample.avg, targetRgb) * 0.35;
    return Math.sqrt(dl * dl + ds * ds) + rgb;
  }
  let dh = Math.abs(sHsl.h - tHsl.h);
  if (dh > 180) dh = 360 - dh;
  const dl = (sHsl.l - tHsl.l) * 80;
  const ds = (sHsl.s - tHsl.s) * 60;
  return dh * 1.8 + Math.sqrt(dl * dl + ds * ds);
}

async function analyzeImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const meta = await sharp(buf).metadata();
  const w = meta.width || 800;
  const h = meta.height || 800;
  const side = Math.floor(Math.min(w, h) * 0.55);
  const left = Math.floor((w - side) / 2);
  const top = Math.floor((h - side) / 2);
  const { data } = await sharp(buf)
    .extract({ left, top, width: side, height: side })
    .resize(48, 48, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const samples = [];
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (isBackgroundPixel(r, g, b)) continue;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max < 30 || min > 248) continue;
    samples.push({ r, g, b, ...rgbToHsl(r, g, b) });
  }
  if (!samples.length) {
    return { avg: { r: 128, g: 128, b: 128 }, hsl: { h: 0, s: 0, l: 0.5 } };
  }
  const avg = {
    r: samples.reduce((s, p) => s + p.r, 0) / samples.length,
    g: samples.reduce((s, p) => s + p.g, 0) / samples.length,
    b: samples.reduce((s, p) => s + p.b, 0) / samples.length,
  };
  return { avg, hsl: rgbToHsl(avg.r, avg.g, avg.b) };
}

function rgbBuildMap(colorIds, analyses, forbidZero) {
  const candidates = analyses
    .map((a, i) => ({ a, i }))
    .filter(({ i }) => !(forbidZero && i === 0));
  const pairs = [];
  for (const colorId of colorIds) {
    const target = colorIdToTargetRgb(colorId);
    if (!target) continue;
    for (const { a, i } of candidates) {
      pairs.push({ colorId, index: i, dist: colorDistance(a, target) });
    }
  }
  pairs.sort((x, y) => x.dist - y.dist);
  const map = {};
  const usedC = new Set();
  const usedI = new Set();
  const dists = {};
  for (const p of pairs) {
    if (usedC.has(p.colorId) || usedI.has(p.index)) continue;
    map[p.colorId] = [p.index];
    dists[p.colorId] = p.dist;
    usedC.add(p.colorId);
    usedI.add(p.index);
  }
  for (const colorId of colorIds) {
    if (map[colorId]) continue;
    const free = candidates.find(({ i }) => !usedI.has(i));
    map[colorId] = [free?.i ?? (forbidZero ? 1 : 0)];
    dists[colorId] = 999;
  }
  return { map, dists };
}

function mapsAgree(a, b, colorIds) {
  for (const id of colorIds) {
    const ai = a?.[id]?.[0];
    const bi = b?.[id]?.[0];
    if (ai !== bi) return false;
  }
  return true;
}

function hasSimilarPair(colorIds) {
  const labs = colorIds.map(colorLabel).map((s) => s.toLowerCase());
  const groups = [
    ["biela", "krémová", "béžová", "prírodná", "kremova"],
    ["ružová", "staroružová", "bordová", "vínová", "červená"],
    ["zlatá", "žltá", "oranžová", "béžová", "okrová", "medená"],
    ["sivá", "strieborná", "biela"],
    ["hnedá", "prírodná", "béžová", "medená", "okrová"],
    ["zelená", "svetlozelená", "olivová", "limetková", "modrozelená"],
  ];
  for (const g of groups) {
    const hits = labs.filter((l) => g.some((x) => l.includes(x) || x.includes(l)));
    if (hits.length >= 2) return true;
  }
  return false;
}

function hasMetallic(colorIds) {
  return colorIds.some((id) => {
    const l = colorLabel(id).toLowerCase();
    return l.includes("zlat") || l.includes("striebor") || l.includes("metal");
  });
}

async function main() {
  const args = parseArgs(process.argv);
  const OUT = resolve(args.out);
  const env = loadEnv();
  const sb = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  const { data, error } = await sb
    .from("products")
    .select("id, sku, name, category, color_ids, images, color_image_map")
    .like("sku", `${args.prefix}-%`)
    .order("sku");
  if (error) throw error;

  const multi = (data || []).filter((p) => (p.color_ids || []).length >= 2);
  const sure = [];
  const review = [];

  console.log(`Ranking ${multi.length} multi-color products…`);

  for (const p of multi) {
    const colors = p.color_ids || [];
    const images = p.images || [];
    const forbidZero = images.length >= colors.length + 1;
    const reasons = [];

    let agree = false;
    let maxDist = 0;
    let uniqueIndexes = new Set();

    try {
      const analyses = [];
      for (const url of images) analyses.push(await analyzeImage(url));
      if (forbidZero && analyses[0]) analyses[0].isGroup = true;
      const { map: rgbMap, dists } = rgbBuildMap(colors, analyses, forbidZero);
      agree = mapsAgree(p.color_image_map, rgbMap, colors);
      maxDist = Math.max(...Object.values(dists));
      for (const id of colors) {
        const idx = p.color_image_map?.[id]?.[0];
        if (idx != null) uniqueIndexes.add(idx);
      }
    } catch (err) {
      reasons.push(`analýza selhala: ${err.message}`);
    }

    // Risk heuristics
    if (!agree) reasons.push("vision ≠ RGB shoda");
    if (colors.length >= 6) reasons.push(`${colors.length} farieb`);
    if (hasSimilarPair(colors) && (!agree || colors.length >= 4)) {
      reasons.push("podobné farby vedľa seba");
    }
    if (hasMetallic(colors) && (!agree || colors.length >= 3)) {
      reasons.push("metalická farba");
    }
    if (images.length < colors.length) reasons.push("menej fotiek než farieb");
    if (uniqueIndexes.size < colors.length) {
      reasons.push("viac farieb na rovnakú fotku");
    }
    if (maxDist > 110 && !agree) reasons.push("slabá farebná zhoda na snímku");
    if (
      /flowerbox|box|taška/i.test(p.name) &&
      colors.length >= 4 &&
      !agree
    ) {
      reasons.push("flowerbox / viac farieb");
    }

    // Tiering:
    // - one-photo shared: can't assign distinct photos → separate bucket
    // - must review: vision/RGB disagree OR many colors OR metal+complex
    // - sure: agree + unique indexes + enough photos
    const onePhotoShared =
      images.length < colors.length ||
      uniqueIndexes.size < Math.min(colors.length, images.length);

    const mustReview =
      !agree ||
      colors.length >= 6 ||
      reasons.includes("metalická farba") ||
      reasons.includes("flowerbox / viac farieb") ||
      (hasSimilarPair(colors) && colors.length >= 4 && !agree);

    const entry = {
      sku: p.sku,
      name: p.name,
      category: p.category,
      colors: colors.map(colorLabel).join(", "),
      images: images.length,
      colorCount: colors.length,
      reasons,
      map: p.color_image_map,
    };

    if (onePhotoShared && images.length <= 2 && colors.length >= 2) {
      // e.g. wreath with 2 color labels but 1 photo — not a mapping bug
      entry.tier = "shared";
      review.push(entry); // will split later
    } else if (mustReview || (!agree && colors.length >= 3)) {
      entry.tier = "review";
      review.push(entry);
    } else {
      entry.tier = "sure";
      sure.push(entry);
    }

    console.log(
      `${p.sku} → ${entry.tier === "sure" ? "ISTÝ" : entry.tier === "shared" ? "1 FOTKA" : "KONTROLA"} (${reasons.join("; ") || "OK"})`,
    );
  }

  const shared = review.filter((r) => r.tier === "shared");
  const needReview = review.filter((r) => r.tier !== "shared");
  sure.sort((a, b) => a.sku.localeCompare(b.sku));
  needReview.sort((a, b) => a.sku.localeCompare(b.sku));
  shared.sort((a, b) => a.sku.localeCompare(b.sku));

  const lines = [
    `Vícbarevné produkty: ${multi.length}`,
    `✅ Spíš v pohodě (nemusíš kontrolovat): ${sure.length}`,
    `⚠️ Ke kontrole (priorita): ${needReview.length}`,
    `ℹ️ Jedna/málo fotek na víc barev (nejde rozdělit po fotkách): ${shared.length}`,
    "",
    "========== KE KONTROLE ==========",
  ];
  for (const r of needReview) {
    lines.push(
      `${r.sku} | ${r.name} | ${r.category} | ${r.colorCount} farieb / ${r.images} fotiek | ${r.colors}`,
    );
    lines.push(`   důvod: ${r.reasons.join("; ") || "—"}`);
  }
  lines.push("");
  lines.push("========== 1 FOTKA / SDÍLENÉ (jen info) ==========");
  for (const r of shared) {
    lines.push(
      `${r.sku} | ${r.name} | ${r.colorCount} farieb / ${r.images} fotiek | ${r.colors}`,
    );
  }
  lines.push("");
  lines.push("========== ISTÉ (skip) ==========");
  for (const r of sure) {
    lines.push(`${r.sku} | ${r.name} | ${r.colors}`);
  }

  writeFileSync(resolve(OUT, "KONTROLA-FARBY.txt"), lines.join("\n") + "\n", "utf8");
  writeFileSync(
    resolve(OUT, "KONTROLA-FARBY-review.json"),
    JSON.stringify(needReview, null, 2),
    "utf8",
  );
  writeFileSync(
    resolve(OUT, "KONTROLA-FARBY-sure.json"),
    JSON.stringify(sure, null, 2),
    "utf8",
  );
  writeFileSync(
    resolve(OUT, "KONTROLA-FARBY-shared.json"),
    JSON.stringify(shared, null, 2),
    "utf8",
  );

  console.log(
    `\nSure: ${sure.length} | Review: ${needReview.length} | Shared-photo: ${shared.length}`,
  );
  console.log(`→ ${OUT}/KONTROLA-FARBY.txt`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
