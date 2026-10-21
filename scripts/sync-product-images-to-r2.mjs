/**
 * Sync Supabase Storage `product-images` → R2 `pacidekor-product-images`
 * (same object keys). Uses Cloudflare REST API + OAuth from wrangler login
 * (much faster than per-object `wrangler r2 object put`).
 *
 * Requires:
 *  - R2 bucket + media host (`npm run cf:setup-r2`)
 *  - .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *  - `npx wrangler login` (OAuth token)
 *
 * Usage: node scripts/sync-product-images-to-r2.mjs
 *        node scripts/sync-product-images-to-r2.mjs --dry-run
 *        node scripts/sync-product-images-to-r2.mjs --limit=50
 *        node scripts/sync-product-images-to-r2.mjs --concurrency=16
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const BUCKET = "pacidekor-product-images";
const SB_BUCKET = "product-images";
const ACCOUNT_ID = "8a761865e89e371fceb1289d2e079359";

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(ROOT, ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let v = m[2];
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      process.env[m[1]] ??= v;
    }
  } catch {
    /* optional */
  }
}

function loadWranglerOauthToken() {
  const candidates = [
    join(homedir(), "AppData", "Roaming", "xdg.config", ".wrangler", "config", "default.toml"),
    join(homedir(), ".config", ".wrangler", "config", "default.toml"),
    join(homedir(), ".wrangler", "config", "default.toml"),
  ];
  for (const p of candidates) {
    try {
      const raw = readFileSync(p, "utf8");
      const m = raw.match(/oauth_token\s*=\s*"([^"]+)"/);
      if (m?.[1]) return m[1];
    } catch {
      /* try next */
    }
  }
  throw new Error("Wrangler OAuth token not found — run: npx wrangler login");
}

loadEnvLocal();

const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;
const concArg = process.argv.find((a) => a.startsWith("--concurrency="));
const concurrency = Math.max(1, Number(concArg?.split("=")[1] || 6));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const cfToken = dryRun ? null : loadWranglerOauthToken();

async function listAll(prefix = "") {
  const out = [];
  let offset = 0;
  const pageSize = 100;
  for (;;) {
    const { data, error } = await supabase.storage.from(SB_BUCKET).list(prefix, {
      limit: pageSize,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(error.message);
    if (!data?.length) break;

    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (!item.metadata && !item.id) {
        out.push(...(await listAll(path)));
      } else if (item.name && item.metadata) {
        out.push(path);
      } else if (item.name && !String(item.name).includes(".")) {
        out.push(...(await listAll(path)));
      } else if (item.name) {
        out.push(path);
      }
    }

    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return out;
}

async function listExistingR2Keys() {
  const existing = new Set();
  let cursor = undefined;
  for (;;) {
    const qs = new URLSearchParams({ per_page: "1000" });
    if (cursor) qs.set("cursor", cursor);
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}/objects?${qs}`,
      { headers: { Authorization: `Bearer ${cfToken}` } },
    );
    const json = await res.json();
    if (!json.success) {
      throw new Error(`R2 list failed: ${JSON.stringify(json.errors)}`);
    }
    for (const obj of json.result || []) {
      if (obj.key) existing.add(obj.key);
    }
    cursor = json.result_info?.cursor;
    if (!cursor || !(json.result || []).length) break;
  }
  return existing;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function putToR2(objectKey, bytes, contentType) {
  const encKey = objectKey
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/");
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}/objects/${encKey}`;
  let lastErr = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const res = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${cfToken}`,
          "Content-Type": contentType || "application/octet-stream",
        },
        body: bytes,
      });
      if (res.ok) return;
      const text = await res.text();
      lastErr = new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      if (res.status === 429 || res.status >= 500) {
        const backoff = Math.min(30_000, 500 * 2 ** attempt) + Math.random() * 400;
        await sleep(backoff);
        continue;
      }
      throw lastErr;
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      if (/fetch failed|ECONNRESET|ETIMEDOUT|socket/i.test(lastErr.message)) {
        await sleep(Math.min(15_000, 400 * 2 ** attempt));
        continue;
      }
      throw lastErr;
    }
  }
  throw lastErr ?? new Error("putToR2 failed");
}

async function mapPool(items, n, fn) {
  let i = 0;
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
}

async function main() {
  console.log(`Listing ${SB_BUCKET}…`);
  let keys = await listAll("");
  console.log(`Found ${keys.length} objects in Supabase`);

  if (Number.isFinite(limit)) {
    keys = keys.slice(0, limit);
    console.log(`Limited to ${keys.length}`);
  }

  if (dryRun) {
    for (const k of keys) console.log(`[dry-run] ${k}`);
    console.log(`Done. ok=0 fail=0 skipped=${keys.length}`);
    return;
  }

  let existing = new Set();
  if (!force) {
    console.log("Listing existing R2 keys (for skip)…");
    existing = await listExistingR2Keys();
    console.log(`R2 already has ${existing.size} objects`);
  }

  let ok = 0;
  let fail = 0;
  let skipped = 0;
  const t0 = Date.now();

  await mapPool(keys, concurrency, async (keyPath) => {
    if (!force && existing.has(keyPath)) {
      skipped += 1;
      return;
    }

    const { data, error } = await supabase.storage
      .from(SB_BUCKET)
      .download(keyPath);
    if (error || !data) {
      console.error("download fail", keyPath, error?.message);
      fail += 1;
      return;
    }

    const buf = Buffer.from(await data.arrayBuffer());
    const contentType = data.type || "image/webp";
    try {
      await putToR2(keyPath, buf, contentType);
      ok += 1;
      if (ok % 50 === 0) {
        const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
        console.log(`… ${ok} uploaded, ${skipped} skipped, ${fail} fail (${elapsed}s)`);
      }
    } catch (e) {
      console.error("put fail", keyPath, e?.message ?? e);
      fail += 1;
    }
  });

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`Done. ok=${ok} fail=${fail} skipped=${skipped} (${elapsed}s)`);
  if (fail) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
