/**
 * Reframe merged-in product photos to match the original color's framing.
 * Preview only unless --upload is passed.
 *
 *   node tmp/zoom-check/reframe-merged.mjs
 *   node tmp/zoom-check/reframe-merged.mjs --upload
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve("tmp/zoom-check/reframe");
const OUT = 1800;
const WEBP_QUALITY = 82;
const FOLDER = "22437e1d-5c63-4ecb-a461-0dffd2af4c52";
const BASE =
  "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/" +
  FOLDER +
  "/";

const upload = process.argv.includes("--upload");

/** scale > 1 crop in; scale < 1 pad out. biasY 0 = crop/pad equally, 1 = only from top. */
const JOBS = [
  {
    sku: "PD-X58777SR",
    name: "fiala",
    ref: "36c38bb9-2f21-4f00-b6ca-ed87e6631b3e.webp",
    groups: [
      {
        color: "kremova",
        scale: 1.24,
        biasY: 0.62,
        files: [
          "f0b506bd-be5b-4d0d-9d70-40f006481c44.webp",
          "a36def4d-5a4c-434a-8d77-d45f946d3049.webp",
          "3fed4b4a-7aa2-41c3-9931-5547d625adaf.webp",
        ],
      },
      {
        color: "biela",
        scale: 1.24,
        biasY: 0.62,
        files: [
          "1b612747-c56b-4a45-8d8e-fbf8b51f5906.webp",
          "6346679c-ed54-4cc1-950d-baedac73f5dd.webp",
          "54ef1e7e-7d97-4755-a883-5d1f2eb154aa.webp",
        ],
      },
    ],
  },
  {
    sku: "PD-SZZBEPH8",
    name: "gypso",
    ref: "dcb75640-c9c2-4d5c-be93-2ddc83c80d97.webp",
    groups: [
      {
        color: "biela",
        scale: 1.14,
        biasY: 0.68,
        files: [
          "b341f8e2-f420-4648-a414-ed7dde2a4056.webp",
          "4b0284f4-08f5-4b0c-a97f-61fef191f4cc.webp",
          "17b8859c-75af-4f69-9971-d0d8273cf1b5.webp",
        ],
      },
    ],
  },
  {
    sku: "PD-TZDGX9ND",
    name: "chrys",
    ref: "da2b28fc-ad8c-4ed2-be2a-dcaa0a144994.webp",
    groups: [
      {
        color: "biela",
        scale: 1.12,
        biasY: 0.68,
        files: [
          "9f35f122-ce47-48e5-8c9d-b10f6d8c053f.webp",
          "e1065a5f-ec72-4078-b2aa-c57eed97c3c3.webp",
          "c71ddf04-20bf-4ac4-9983-0e08240a03c8.webp",
        ],
      },
      {
        color: "cervena",
        scale: 1.14,
        biasY: 0.68,
        files: [
          "25a1c9e7-ad0f-4df8-9c97-5528d4cc4d84.webp",
          "79665d24-705b-4db0-afa2-d2c05c4778cc.webp",
          "9ef2a825-1f3d-427f-a600-5bf394b8ec4e.webp",
        ],
      },
    ],
  },
];

function loadEnvLocal() {
  const text = fs.readFileSync(".env.local", "utf8");
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    env[m[1]] = m[2];
  }
  return env;
}

async function fetchBuf(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function sampleBg(buf) {
  const { data } = await sharp(buf)
    .resize(40, 40, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let r = 0,
    g = 0,
    b = 0,
    n = 0;
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 40; x += 1) {
      const i = (y * 40 + x) * 3;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n += 1;
    }
  }
  return {
    r: Math.round(r / n),
    g: Math.round(g / n),
    b: Math.round(b / n),
  };
}

async function reframe(srcBuf, scale, biasY) {
  const squared = await sharp(srcBuf, { failOn: "none" })
    .rotate()
    .resize(OUT, OUT, { fit: "cover" })
    .toBuffer();

  if (scale > 1) {
    const crop = Math.round(OUT / scale);
    const extra = OUT - crop;
    const top = Math.round(extra * biasY);
    const left = Math.round(extra / 2);
    return sharp(squared)
      .extract({
        left: Math.max(0, left),
        top: Math.max(0, Math.min(top, extra)),
        width: crop,
        height: crop,
      })
      .resize(OUT, OUT)
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toBuffer();
  }

  const inner = Math.round(OUT * scale);
  const extra = OUT - inner;
  const top = Math.round(extra * (1 - biasY));
  const left = Math.round(extra / 2);
  const bg = await sampleBg(squared);
  const innerBuf = await sharp(squared).resize(inner, inner).toBuffer();
  return sharp({
    create: {
      width: OUT,
      height: OUT,
      channels: 3,
      background: bg,
    },
  })
    .composite([{ input: innerBuf, left, top }])
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toBuffer();
}

async function toJpg(buf, size = 360) {
  return sharp(buf).resize(size, size, { fit: "cover" }).jpeg({ quality: 72 }).toBuffer();
}

fs.mkdirSync(ROOT, { recursive: true });

const mapping = [];

for (const job of JOBS) {
  const refBuf = await fetchBuf(BASE + job.ref);
  const refJpg = await toJpg(refBuf);
  for (const group of job.groups) {
    const tiles = [];
    const labelH = 28;
    const cell = 360;
    tiles.push({
      input: Buffer.from(
        `<svg width="${cell}" height="${labelH}"><rect width="100%" height="100%" fill="#111"/><text x="8" y="20" font-size="13" fill="#fff" font-family="Arial">${job.name} REF</text></svg>`,
      ),
      left: 0,
      top: 0,
    });
    tiles.push({ input: refJpg, left: 0, top: labelH });

    for (let i = 0; i < group.files.length; i += 1) {
      const file = group.files[i];
      const src = await fetchBuf(BASE + file);
      const out = await reframe(src, group.scale, group.biasY);
      const localName = `${job.name}-${group.color}-${i}.webp`;
      fs.writeFileSync(path.join(ROOT, localName), out);
      mapping.push({
        sku: job.sku,
        color: group.color,
        oldFile: file,
        localName,
        oldUrl: BASE + file,
      });

      const x = (i + 1) * cell;
      tiles.push({
        input: Buffer.from(
          `<svg width="${cell}" height="${labelH}"><rect width="100%" height="100%" fill="#111"/><text x="8" y="20" font-size="12" fill="#fff" font-family="Arial">${group.color} ${i} s${group.scale}</text></svg>`,
        ),
        left: x,
        top: 0,
      });
      tiles.push({ input: await toJpg(src), left: x, top: labelH });
      tiles.push({
        input: Buffer.from(
          `<svg width="${cell}" height="${labelH}"><rect width="100%" height="100%" fill="#1a3"/><text x="8" y="20" font-size="12" fill="#fff" font-family="Arial">after</text></svg>`,
        ),
        left: x,
        top: labelH + cell,
      });
      tiles.push({ input: await toJpg(out), left: x, top: labelH + cell + labelH });
    }

    const width = cell * (group.files.length + 1);
    const height = labelH + cell + labelH + cell;
    await sharp({
      create: { width, height, channels: 3, background: "#111" },
    })
      .composite(tiles)
      .jpeg({ quality: 70 })
      .toFile(path.join(ROOT, `${job.name}-${group.color}-preview.jpg`));
    console.log("preview", job.name, group.color);
  }
}

if (!upload) {
  fs.writeFileSync(
    path.join(ROOT, "mapping.json"),
    JSON.stringify(mapping, null, 2),
  );
  console.log("preview only, wrote", mapping.length, "files");
  process.exit(0);
}

const env = loadEnvLocal();
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
);

for (const item of mapping) {
  const buf = fs.readFileSync(path.join(ROOT, item.localName));
  const dest = `${FOLDER}/${randomUUID()}.webp`;
  const { error } = await supabase.storage.from("product-images").upload(dest, buf, {
    contentType: "image/webp",
    upsert: false,
    cacheControl: "31536000",
  });
  if (error) throw error;
  item.newUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${dest}`;
  console.log("uploaded", item.localName);
}

fs.writeFileSync(path.join(ROOT, "mapping.json"), JSON.stringify(mapping, null, 2));
console.log("done upload", mapping.length);
