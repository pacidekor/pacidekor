/**
 * Přesný perceptual match engine.
 * - dHash 64 + dHash 256 + aHash 64
 * - porovnání všech fotek ve složce
 * - agregace na úroveň produktu (Supabase)
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const IMG_RE = /\.(jpe?g|png|webp|gif)$/i;
const STATUS_RE = /\s+(NA_ESHOPU|NEJISTE|NENI_NA_ESHOPU)$/i;

const THRESH = {
  dhash64: { strong: 4, ok: 7, weak: 10 },
  ahash64: { strong: 5, ok: 8, weak: 11 },
  dhash256: { strong: 18, ok: 30, weak: 42 },
};

function loadEnv(rootDir) {
  const envPath = path.join(rootDir, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

function safe(name) {
  return String(name)
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function stripStatus(name) {
  return name.replace(STATUS_RE, "").trim();
}

function walkImages(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let ents;
    try {
      ents = fs.readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of ents) {
      const p = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (IMG_RE.test(e.name)) out.push(p);
    }
  }
  return out;
}

function hamming(a, b) {
  let x = a ^ b;
  let n = 0;
  while (x) {
    x &= x - 1n;
    n += 1;
  }
  return n;
}

async function dhashBits(file, w, h) {
  const { data } = await sharp(file)
    .rotate()
    .greyscale()
    .resize(w, h, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let bits = 0n;
  let bit = 0n;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w - 1; x++) {
      if (data[y * w + x] > data[y * w + x + 1]) bits |= 1n << bit;
      bit += 1n;
    }
  }
  return bits;
}

async function ahashBits(file, size = 8) {
  const { data } = await sharp(file)
    .rotate()
    .greyscale()
    .resize(size, size, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const avg = data.reduce((s, v) => s + v, 0) / data.length;
  let bits = 0n;
  for (let i = 0; i < data.length; i++) {
    if (data[i] > avg) bits |= 1n << BigInt(i);
  }
  return bits;
}

async function computeHashes(file) {
  const [dhash64, dhash256, ahash64] = await Promise.all([
    dhashBits(file, 9, 8),
    dhashBits(file, 17, 16),
    ahashBits(file, 8),
  ]);
  return { dhash64, dhash256, ahash64 };
}

function pairDistance(local, db) {
  const dhash64 = hamming(local.dhash64, db.dhash64);
  const dhash256 = hamming(local.dhash256, db.dhash256);
  const ahash64 = hamming(local.ahash64, db.ahash64);
  const votes = [
    dhash64 <= THRESH.dhash64.ok,
    dhash256 <= THRESH.dhash256.ok,
    ahash64 <= THRESH.ahash64.ok,
  ].filter(Boolean).length;
  const strongVotes = [
    dhash64 <= THRESH.dhash64.strong,
    dhash256 <= THRESH.dhash256.strong,
    ahash64 <= THRESH.ahash64.strong,
  ].filter(Boolean).length;
  return { dhash64, dhash256, ahash64, votes, strongVotes };
}

function pairQuality(dist) {
  if (dist.strongVotes >= 2) return "strong";
  if (dist.votes >= 3) return "strong";
  if (dist.votes >= 2 && dist.dhash64 <= THRESH.dhash64.weak) return "ok";
  if (
    dist.dhash64 <= THRESH.dhash64.weak &&
    dist.dhash256 <= THRESH.dhash256.weak &&
    dist.ahash64 <= THRESH.ahash64.weak
  ) {
    return "weak";
  }
  return "none";
}

function imageUuidFromPath(filePath) {
  const base = path.basename(filePath);
  const m = base.match(
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  );
  return m ? m[1].toLowerCase() : null;
}

function imageUuidFromUrl(url) {
  const m = String(url).match(
    /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi,
  );
  return m ? m[m.length - 1].toLowerCase() : null;
}

async function fetchProducts() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(
    `${url}/rest/v1/products?select=id,name,sku,slug,images&order=name`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

function buildProductIndex(products) {
  const imageToProduct = new Map();
  const productsById = new Map();
  for (const p of products) {
    productsById.set(p.id, p);
    for (const img of p.images || []) {
      const uuid = imageUuidFromUrl(img);
      if (uuid) imageToProduct.set(uuid, p.id);
    }
  }
  return { imageToProduct, productsById };
}

async function buildDbIndex(dbDir, cacheFile) {
  const files = walkImages(dbDir);
  let cache = {};
  if (cacheFile && fs.existsSync(cacheFile)) {
    try {
      cache = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
    } catch {
      cache = {};
    }
  }

  const rows = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const rel = path.relative(dbDir, file).replace(/\\/g, "/");
    const uuid = imageUuidFromPath(file);
    let entry = cache[rel];
    if (!entry) {
      try {
        const hashes = await computeHashes(file);
        entry = {
          uuid,
          rel,
          dhash64: hashes.dhash64.toString(),
          dhash256: hashes.dhash256.toString(),
          ahash64: hashes.ahash64.toString(),
        };
        cache[rel] = entry;
      } catch {
        continue;
      }
    }
    rows.push({
      file,
      rel,
      uuid: entry.uuid || uuid,
      hashes: {
        dhash64: BigInt(entry.dhash64),
        dhash256: BigInt(entry.dhash256),
        ahash64: BigInt(entry.ahash64),
      },
    });
    if ((i + 1) % 200 === 0) console.log("  DB hash", i + 1, "/", files.length);
  }

  if (cacheFile) {
    fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 0), "utf8");
  }
  return rows;
}

async function hashLocalImages(files, cacheFile, cacheKeyPrefix) {
  let cache = {};
  if (cacheFile && fs.existsSync(cacheFile)) {
    try {
      cache = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
    } catch {
      cache = {};
    }
  }

  const rows = [];
  for (const file of files) {
    const key = `${cacheKeyPrefix}:${file}`;
    let entry = cache[key];
    if (!entry) {
      try {
        const hashes = await computeHashes(file);
        entry = {
          dhash64: hashes.dhash64.toString(),
          dhash256: hashes.dhash256.toString(),
          ahash64: hashes.ahash64.toString(),
        };
        cache[key] = entry;
      } catch {
        continue;
      }
    }
    rows.push({
      file,
      hashes: {
        dhash64: BigInt(entry.dhash64),
        dhash256: BigInt(entry.dhash256),
        ahash64: BigInt(entry.ahash64),
      },
    });
  }

  if (cacheFile) {
    fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 0), "utf8");
  }
  return rows;
}

function scoreFolder(localImages, dbIndex, imageToProduct) {
  const perLocal = [];
  const productScores = new Map();

  for (const local of localImages) {
    let best = null;
    for (const db of dbIndex) {
      const dist = pairDistance(local.hashes, db.hashes);
      const quality = pairQuality(dist);
      if (quality === "none") continue;
      const productId = db.uuid ? imageToProduct.get(db.uuid) || null : null;
      const score =
        (quality === "strong" ? 100 : quality === "ok" ? 60 : 30) -
        dist.dhash64 * 2 -
        dist.ahash64;
      const cand = {
        quality,
        dist,
        db,
        productId,
        score,
      };
      if (!best || cand.score > best.score) best = cand;
    }
    perLocal.push(best);

    if (best?.productId) {
      const cur = productScores.get(best.productId) || {
        productId: best.productId,
        strong: 0,
        ok: 0,
        weak: 0,
        dists: [],
        dbMatches: [],
        localMatches: [],
      };
      cur[best.quality] += 1;
      cur.dists.push(best.dist.dhash64);
      cur.dbMatches.push(best.db.rel);
      cur.localMatches.push(path.basename(best.db.file));
      productScores.set(best.productId, cur);
    }
  }

  const ranked = [...productScores.values()]
    .map((p) => ({
      ...p,
      avgDhash: p.dists.length
        ? p.dists.reduce((a, b) => a + b, 0) / p.dists.length
        : 999,
      totalHits: p.strong + p.ok + p.weak,
      coverage: localImages.length ? (p.strong + p.ok + p.weak) / localImages.length : 0,
      score:
        p.strong * 100 +
        p.ok * 50 +
        p.weak * 15 -
        (p.dists.reduce((a, b) => a + b, 0) / Math.max(p.dists.length, 1)) * 3,
    }))
    .sort((a, b) => b.score - a.score);

  const bestProduct = ranked[0] || null;
  const secondProduct = ranked[1] || null;
  const bestSingle = perLocal
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)[0] || null;

  let status = "NENI_NA_ESHOPU";
  let confidence = "low";
  let reason = "Žádná spolehlivá shoda s e-shopem.";

  if (bestProduct) {
    const gap = secondProduct ? bestProduct.score - secondProduct.score : 999;
    if (
      bestProduct.strong >= 2 ||
      (bestProduct.strong >= 1 && bestProduct.avgDhash <= 3) ||
      (bestProduct.strong + bestProduct.ok >= 2 && bestProduct.avgDhash <= 5 && gap >= 40)
    ) {
      status = "NA_ESHOPU";
      confidence = "high";
      reason = `Produkt ${bestProduct.productId}: ${bestProduct.strong} silných + ${bestProduct.ok} dobrých shod (prům. dHash ${bestProduct.avgDhash.toFixed(1)}).`;
    } else if (
      bestProduct.strong >= 1 ||
      bestProduct.ok >= 2 ||
      (bestProduct.ok >= 1 && bestProduct.avgDhash <= 6) ||
      (bestSingle && bestSingle.quality === "strong" && bestSingle.dist.dhash64 <= 4)
    ) {
      status = "NA_ESHOPU";
      confidence = "medium";
      reason = `Pravděpodobná shoda s produktem ${bestProduct.productId} (${bestProduct.totalHits} fotek, prům. dHash ${bestProduct.avgDhash.toFixed(1)}).`;
    } else if (
      bestProduct.weak >= 1 ||
      bestProduct.ok >= 1 ||
      (bestSingle && bestSingle.quality !== "none")
    ) {
      status = "NEJISTE";
      confidence = "low";
      reason = `Slabá / nejednoznačná shoda${bestProduct.productId ? ` s ${bestProduct.productId}` : ""}.`;
    }
  } else if (bestSingle && bestSingle.quality === "weak") {
    status = "NEJISTE";
    confidence = "low";
    reason = "Jen velmi slabá shoda na úrovni jedné fotky.";
  }

  return {
    status,
    confidence,
    reason,
    bestProduct,
    secondProduct,
    bestSingle,
    ranked: ranked.slice(0, 3),
    localCount: localImages.length,
    matchedLocalCount: perLocal.filter(Boolean).length,
  };
}

module.exports = {
  THRESH,
  IMG_RE,
  STATUS_RE,
  safe,
  stripStatus,
  walkImages,
  loadEnv,
  fetchProducts,
  buildProductIndex,
  buildDbIndex,
  hashLocalImages,
  scoreFolder,
  imageUuidFromPath,
  imageUuidFromUrl,
};
