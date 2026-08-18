/**
 * Match Mečík white photos to pink/yellow framing.
 *   node tmp/zoom-check/mecik-match.mjs
 *   node tmp/zoom-check/mecik-match.mjs --upload
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const OUT = 1800;
const Q = 82;
const DIR = "tmp/zoom-check/mecik-match";
const FOLDER = "22437e1d-5c63-4ecb-a461-0dffd2af4c52";
const upload = process.argv.includes("--upload");

const WHITE_VASE = "public/products/paci-kvety-nove-ready/79H/1.webp";
const WHITE_DETAIL = "public/products/paci-kvety-nove-ready/79H/2.webp";
const WHITE_STEM = "public/products/paci-kvety-nove-ready/79H/3.webp";
const DONOR_VASE = "public/products/paci-kvety-nove-ready/80H/1.webp";
const PINK_DETAIL = "public/products/paci-kvety-nove-ready/80H/14.webp";
const PINK_STEM = "public/products/paci-kvety-nove-ready/80H/15.webp";

function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

async function toSquare(src, size = OUT) {
  return sharp(src, { failOn: "none" })
    .rotate()
    .resize(size, size, { fit: "cover" })
    .toBuffer();
}

async function sampleTop(buf) {
  const { data } = await sharp(buf)
    .resize(50, 50, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let r = 0,
    g = 0,
    b = 0,
    n = 0;
  for (let y = 0; y < 10; y += 1) {
    for (let x = 0; x < 50; x += 1) {
      const i = (y * 50 + x) * 3;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n += 1;
    }
  }
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
}

async function vaseWidthAtRow(buf, size, y) {
  const { data } = await sharp(buf)
    .extract({ left: 0, top: y, width: size, height: 1 })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minX = size,
    maxX = 0;
  for (let x = 0; x < size; x += 1) {
    const r = data[x * 3];
    const g = data[x * 3 + 1];
    const b = data[x * 3 + 2];
    const avg = (r + g + b) / 3;
    const sat = (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(1, Math.max(r, g, b));
    const isVase = avg < 175 && sat > 0.12 && r > g - 10 && r > b;
    if (isVase) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
  }
  if (maxX < minX) return null;
  return { minX, maxX, width: maxX - minX + 1, cx: (minX + maxX) / 2 };
}

async function findDonorRowForWidth(donorBuf, size, targetWidth) {
  let bestY = Math.round(size * 0.55);
  let bestDiff = 1e9;
  for (let y = Math.round(size * 0.35); y < Math.round(size * 0.85); y += 2) {
    const row = await vaseWidthAtRow(donorBuf, size, y);
    if (!row) continue;
    const diff = Math.abs(row.width - targetWidth);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestY = y;
    }
  }
  return bestY;
}

async function matchVase() {
  const white = await toSquare(WHITE_VASE);
  const donor = await toSquare(DONOR_VASE);
  const bg = await sampleTop(white);

  const scale = 0.74;
  const inner = Math.round(OUT * scale);
  const top = Math.round(OUT * 0.055);
  const left = Math.round((OUT - inner) / 2);
  const scaled = await sharp(white).resize(inner, inner).toBuffer();

  const keepH = Math.round(inner * 0.9);
  const croppedWhite = await sharp(scaled)
    .extract({ left: 0, top: 0, width: inner, height: keepH })
    .toBuffer();

  const dy = Math.round(OUT * 0.64);
  const dx = Math.round(OUT * 0.35);
  const dw = Math.round(OUT * 0.3);
  const dh = OUT - dy;
  const piece = await sharp(donor)
    .extract({ left: dx, top: dy, width: dw, height: dh })
    .toBuffer();

  const targetW = Math.round(inner * 0.27);
  const pieceTop = top + keepH - 40;
  const targetH = OUT - pieceTop;
  const pieceFit = await sharp(piece)
    .resize(targetW, targetH, { fit: "cover" })
    .toBuffer();

  const pieceLeft = Math.round((OUT - targetW) / 2);

  return sharp({
    create: { width: OUT, height: OUT, channels: 3, background: bg },
  })
    .composite([
      { input: pieceFit, left: pieceLeft, top: pieceTop },
      { input: croppedWhite, left, top },
    ])
    .webp({ quality: Q, effort: 4 })
    .toBuffer();
}

async function matchDetail() {
  const white = await toSquare(WHITE_DETAIL, OUT);
  const crop = Math.round(OUT * 0.7);
  const left = Math.round((OUT - crop) / 2);
  const top = OUT - crop;
  return sharp(white)
    .extract({
      left: Math.max(0, left),
      top: Math.max(0, top),
      width: crop,
      height: crop,
    })
    .resize(OUT, OUT)
    .webp({ quality: Q, effort: 4 })
    .toBuffer();
}

async function matchStem() {
  const white = await toSquare(WHITE_STEM, OUT);
  const pink = await toSquare(PINK_STEM, OUT);
  const bg = await sampleTop(pink);
  const scale = 0.88;
  const inner = Math.round(OUT * scale);
  const top = Math.round(OUT * 0.05);
  const left = Math.round((OUT - inner) / 2);
  const scaled = await sharp(white).resize(inner, inner).toBuffer();
  return sharp({
    create: { width: OUT, height: OUT, channels: 3, background: bg },
  })
    .composite([{ input: scaled, left, top }])
    .webp({ quality: Q, effort: 4 })
    .toBuffer();
}

async function previewPair(label, beforePath, afterBuf) {
  const cell = 420;
  const before = await sharp(beforePath)
    .resize(cell, cell, { fit: "cover" })
    .jpeg({ quality: 72 })
    .toBuffer();
  const after = await sharp(afterBuf)
    .resize(cell, cell, { fit: "cover" })
    .jpeg({ quality: 72 })
    .toBuffer();
  const svg = (t) =>
    Buffer.from(
      `<svg width="${cell}" height="28"><rect width="100%" height="100%" fill="#111"/><text x="10" y="20" font-size="14" fill="#fff" font-family="Arial">${t}</text></svg>`,
    );
  await sharp({
    create: { width: cell * 2, height: cell + 28, channels: 3, background: "#111" },
  })
    .composite([
      { input: svg(label + " BEFORE"), left: 0, top: 0 },
      { input: svg(label + " AFTER"), left: cell, top: 0 },
      { input: before, left: 0, top: 28 },
      { input: after, left: cell, top: 28 },
    ])
    .jpeg({ quality: 72 })
    .toFile(path.join(DIR, `${label}-preview.jpg`));
}

fs.mkdirSync(DIR, { recursive: true });

const vase = await matchVase();
const detail = await matchDetail();
const stem = await matchStem();
fs.writeFileSync(path.join(DIR, "vase.webp"), vase);
fs.writeFileSync(path.join(DIR, "detail.webp"), detail);
fs.writeFileSync(path.join(DIR, "stem.webp"), stem);

await previewPair("vase", WHITE_VASE, vase);
await previewPair("detail", WHITE_DETAIL, detail);
await previewPair("stem", WHITE_STEM, stem);
await previewPair("vase-vs-pink", "public/products/paci-kvety-nove-ready/80H/13.webp", vase);
await previewPair("detail-vs-pink", PINK_DETAIL, detail);

console.log("previews in", DIR);

if (!upload) process.exit(0);

const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const urls = [];
for (const name of ["vase", "detail", "stem"]) {
  const buf = fs.readFileSync(path.join(DIR, `${name}.webp`));
  const dest = `${FOLDER}/${randomUUID()}.webp`;
  const { error } = await supabase.storage.from("product-images").upload(dest, buf, {
    contentType: "image/webp",
    upsert: false,
    cacheControl: "31536000",
  });
  if (error) throw error;
  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${dest}`;
  urls.push(url);
  console.log("uploaded", name, url);
}
fs.writeFileSync(path.join(DIR, "urls.json"), JSON.stringify(urls, null, 2));
console.log("URLS", urls);
