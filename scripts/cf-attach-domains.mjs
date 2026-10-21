/**
 * Attach pacidekor.sk + www to Worker as Custom Domains (zone must be active).
 * Uses wrangler OAuth from local login.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const WRANGLER = resolve(ROOT, "wrangler.jsonc");

function stripJsonc(raw) {
  return raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function ensureRoutesInWrangler() {
  const raw = readFileSync(WRANGLER, "utf8");
  if (raw.includes('"custom_domain": true')) {
    console.log("wrangler.jsonc already has custom_domain routes.");
    return;
  }
  const parsed = JSON.parse(stripJsonc(raw));
  parsed.routes = [
    { pattern: "pacidekor.sk", custom_domain: true },
    { pattern: "www.pacidekor.sk", custom_domain: true },
  ];
  writeFileSync(WRANGLER, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  console.log("Added custom_domain routes to wrangler.jsonc");
}

ensureRoutesInWrangler();

console.log("Deploying Worker to register Custom Domains (needs active zone)…");
execFileSync(
  "npx",
  ["wrangler", "deploy", "--keep-vars"],
  { cwd: ROOT, stdio: "inherit", shell: true },
);
console.log("Done. Smoke: https://pacidekor.sk/ and https://www.pacidekor.sk/");
