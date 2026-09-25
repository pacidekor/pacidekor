/**
 * Vision-based reassignment of color_image_map for multi-color imports.
 * Never assigns overview/group shot (index 0 when imgs >= colors+1) to a color.
 *
 * Usage:
 *   node scripts/fix-color-maps-vision.mjs --dry-run --limit 5
 *   node scripts/fix-color-maps-vision.mjs --prefix IMP-249 --out public/249produkty-ready
 *   node scripts/fix-color-maps-vision.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const env = {};
  for (const line of readFileSync(resolve(".env.local"), "utf8").split("\n")) {
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
    prefix: "IMP-NEJ",
    out: "public/nejnovejsiprodukty-ready",
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--dry-run") args.dryRun = true;
    else if (argv[i] === "--limit") args.limit = Number(argv[++i]);
    else if (argv[i] === "--only") args.only = argv[++i];
    else if (argv[i] === "--prefix") args.prefix = argv[++i];
    else if (argv[i] === "--out") args.out = argv[++i];
  }
  return args;
}

function colorLabel(id) {
  if (!id.startsWith("custom:")) {
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
    return labels[id] || id;
  }
  const raw = id.slice("custom:".length);
  const sep = raw.indexOf(":");
  if (sep === -1) return id;
  try {
    return decodeURIComponent(raw.slice(sep + 1));
  } catch {
    return raw.slice(sep + 1);
  }
}

async function visionMap({ apiKey, colors, images, name, forbidZero }) {
  const colorList = colors.map((id, i) => `${i}. id="${id}" label="${colorLabel(id)}"`);
  const imageList = images.map((_, i) => {
    const note =
      forbidZero && i === 0
        ? " (OVERVIEW – do NOT assign any color to this index)"
        : "";
    return `${i}${note}`;
  });

  const content = [
    {
      type: "text",
      text: `You assign product photo indexes to color variants for a wholesale florist shop.

Product: ${name}

Colors (assign EACH exactly once to the best matching SINGLE-item photo):
${colorList.join("\n")}

Photo indexes: ${imageList.join(", ")}
${forbidZero ? "Index 0 is a group overview with multiple colors — never use 0." : ""}

Rules:
- Match by the main body color of the product in the photo (ribbon/box), ignore background.
- Gold/silver metallic = gold/silver colors only.
- One photo index per color. Prefer unused indexes.
- If unsure, pick the closest unused photo.
- Return ONLY JSON object: { "<colorId>": [<index>], ... } covering ALL color ids.`,
    },
  ];

  // Attach images (cap to first 12 to stay within limits)
  const maxImgs = Math.min(images.length, 12);
  for (let i = 0; i < maxImgs; i++) {
    content.push({
      type: "text",
      text: `Photo index ${i}:`,
    });
    content.push({
      type: "image_url",
      image_url: { url: images[i], detail: "low" },
    });
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a careful product-photo color matcher. Reply with JSON only.",
        },
        { role: "user", content },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI ${res.status}: ${t.slice(0, 300)}`);
  }
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content || "{}";
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Bad JSON: ${text.slice(0, 200)}`);
  }

  // normalize to { colorId: [index] }
  const out = {};
  const used = new Set();
  for (const id of colors) {
    let idxs = parsed[id];
    if (typeof idxs === "number") idxs = [idxs];
    if (!Array.isArray(idxs) || idxs.length === 0) {
      // try label key
      const lab = colorLabel(id);
      idxs = parsed[lab];
      if (typeof idxs === "number") idxs = [idxs];
    }
    let idx = Array.isArray(idxs) ? Number(idxs[0]) : NaN;
    if (
      !Number.isInteger(idx) ||
      idx < 0 ||
      idx >= images.length ||
      (forbidZero && idx === 0) ||
      used.has(idx)
    ) {
      // find free
      for (let i = forbidZero ? 1 : 0; i < images.length; i++) {
        if (!used.has(i)) {
          idx = i;
          break;
        }
      }
    }
    if (!Number.isInteger(idx)) idx = forbidZero ? 1 : 0;
    out[id] = [idx];
    used.add(idx);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const env = loadEnv();
  if (!env.OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY");
    process.exit(1);
  }

  const PROGRESS = resolve(args.out, "_vision-color-progress.json");
  const loadProgressLocal = () => {
    if (!existsSync(PROGRESS)) return { done: {} };
    try {
      return JSON.parse(readFileSync(PROGRESS, "utf8"));
    } catch {
      return { done: {} };
    }
  };
  const saveProgressLocal = (p) => {
    writeFileSync(PROGRESS, JSON.stringify(p, null, 2), "utf8");
  };

  const sb = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  let q = sb
    .from("products")
    .select("id, sku, name, color_ids, images, color_image_map")
    .like("sku", `${args.prefix}-%`)
    .order("sku");
  if (args.only) q = q.eq("sku", args.only);

  const { data, error } = await q;
  if (error) throw error;

  let products = (data || []).filter((p) => (p.color_ids || []).length >= 2);
  if (args.limit) products = products.slice(0, args.limit);

  const progress = loadProgressLocal();
  console.log(
    `Vision remap ${products.length} multi-color ${args.prefix}-*${args.dryRun ? " (DRY RUN)" : ""}…`,
  );

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const p of products) {
    if (progress.done[p.sku] && !args.dryRun) {
      skipped++;
      continue;
    }
    const colors = p.color_ids || [];
    const images = p.images || [];
    const forbidZero = images.length >= colors.length + 1;

    try {
      const next = await visionMap({
        apiKey: env.OPENAI_API_KEY,
        colors,
        images,
        name: p.name,
        forbidZero,
      });

      console.log(
        `${p.sku} ${p.name}\n  old ${JSON.stringify(p.color_image_map)}\n  new ${JSON.stringify(next)}`,
      );

      if (!args.dryRun) {
        const { error: up } = await sb
          .from("products")
          .update({ color_image_map: next })
          .eq("id", p.id);
        if (up) throw up;
        progress.done[p.sku] = next;
        saveProgressLocal(progress);
      }
      ok++;
      // gentle rate limit
      await new Promise((r) => setTimeout(r, 400));
    } catch (err) {
      console.error(`${p.sku} FAIL`, err.message || err);
      failed++;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  console.log(`\nDone. ok=${ok} skipped=${skipped} failed=${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
