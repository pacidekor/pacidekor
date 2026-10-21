/**
 * After you Enable R2 in the Cloudflare dashboard (billing):
 *  - create pacidekor-product-images
 *  - enable r2.dev public URL (interim)
 *  - attach media.pacidekor.sk when zone is active
 *  - patch wrangler.jsonc with PRODUCT_IMAGES binding
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const BUCKET = "pacidekor-product-images";
const MEDIA_HOST = "media.pacidekor.sk";
const WRANGLER = resolve(ROOT, "wrangler.jsonc");

function wrangler(args) {
  execFileSync("npx", ["wrangler", ...args], {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
  });
}

function stripJsonc(raw) {
  return raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function ensureR2Binding() {
  const raw = readFileSync(WRANGLER, "utf8");
  const parsed = JSON.parse(stripJsonc(raw));
  const existing = parsed.r2_buckets ?? [];
  if (existing.some((b) => b.binding === "PRODUCT_IMAGES")) {
    console.log("PRODUCT_IMAGES binding already in wrangler.jsonc");
    return;
  }
  parsed.r2_buckets = [
    ...existing,
    { binding: "PRODUCT_IMAGES", bucket_name: BUCKET },
  ];
  writeFileSync(WRANGLER, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  console.log("Added PRODUCT_IMAGES R2 binding to wrangler.jsonc");
}

console.log(`Creating R2 bucket ${BUCKET} (requires Enable R2)…`);
try {
  wrangler(["r2", "bucket", "create", BUCKET]);
} catch {
  console.log("Create failed (bucket may already exist) — continuing.");
}

console.log("Enabling r2.dev public access…");
try {
  wrangler(["r2", "bucket", "dev-url", "enable", BUCKET]);
} catch (e) {
  console.warn("dev-url enable failed:", e?.message ?? e);
}

console.log(`Attaching custom domain ${MEDIA_HOST} (zone must be active)…`);
try {
  wrangler([
    "r2",
    "bucket",
    "domain",
    "add",
    BUCKET,
    "--domain",
    MEDIA_HOST,
  ]);
} catch (e) {
  console.warn(
    "media.pacidekor.sk not attached yet (NS / zone). Use r2.dev until then.",
    e?.message ?? e,
  );
}

ensureR2Binding();

console.log(`
Next:
  1) Set Worker + Vercel + .env.local:
       NEXT_PUBLIC_MEDIA_BASE_URL=https://${MEDIA_HOST}
     (or the printed r2.dev URL until custom domain is Active)
  2) npm run sync:product-images-r2
  3) Redeploy Worker so PRODUCT_IMAGES binding is live
  4) New admin uploads go to R2 automatically when MEDIA_BASE is set
`);
