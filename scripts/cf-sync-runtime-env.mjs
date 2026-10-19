/**
 * Push selected .env.local keys to Cloudflare Worker runtime (Variables/Secrets).
 *
 * Prerequisites:
 *   npx wrangler login
 *   (or CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID in env)
 *
 * Usage:
 *   node scripts/cf-sync-runtime-env.mjs
 *
 * Then redeploy with --keep-vars (CI already does) OR just save — secrets apply immediately.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env.local");
const workerName = "pacidekor";

const KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "BREVO_API_KEY",
  "BREVO_SENDER_EMAIL",
  "BREVO_SENDER_NAME",
  "NEXT_PUBLIC_PACKETA_API_KEY",
  "PACKETA_API_PASSWORD",
  "PACKETA_API_LOCALE",
  "PACKETA_WEBHOOK_SIGNING_KEY",
  "PACKETA_INVOICE_LOCALE",
  "NEXT_PUBLIC_PACKETA_WIDGET_LANGUAGE",
  "NEXT_PUBLIC_ORDERS_ENABLED",
  "GOPAY_GOID",
  "GOPAY_CLIENT_ID",
  "GOPAY_CLIENT_SECRET",
  "GOPAY_SHAREABLE_KEY",
  "GOPAY_PRODUCTION",
  "CRON_SECRET",
  "INVOICE_IBAN",
];

function parseEnvLocal(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  /** @type {Record<string, string>} */
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

if (!fs.existsSync(envPath)) {
  console.error("Missing .env.local");
  process.exit(1);
}

const env = parseEnvLocal(envPath);
const missing = KEYS.filter((k) => !env[k]?.trim());
const present = KEYS.filter((k) => env[k]?.trim());

console.log(`Worker: ${workerName}`);
console.log(`Will upload ${present.length} secrets (values hidden).`);
if (missing.length) {
  console.warn(`Skipping missing keys: ${missing.join(", ")}`);
}

const tmpFile = path.join(root, ".cf-secrets-bulk.env");
const body = present.map((k) => `${k}=${env[k]}`).join("\n") + "\n";
fs.writeFileSync(tmpFile, body, { mode: 0o600 });

try {
  const result = spawnSync(
    "npx",
    ["wrangler", "secret", "bulk", tmpFile, "--name", workerName],
    { stdio: "inherit", shell: true, cwd: root, env: process.env },
  );
  process.exit(result.status === null ? 1 : result.status);
} finally {
  try {
    fs.unlinkSync(tmpFile);
  } catch {
    // ignore
  }
}
