/**
 * Cloudflare CI runs `npm run build` then `wrangler deploy`.
 * OpenNext itself also invokes `npm run build` for the Next.js compile.
 *
 * - Outer call on CF  → opennextjs-cloudflare build (creates .open-next)
 * - Nested call       → next build (lock file present)
 * - Vercel / local    → next build
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const lockPath = path.join(process.cwd(), ".open-next-build.lock");
const onVercel = process.env.VERCEL === "1";
const onCloudflare =
  process.env.CF_PAGES === "1" ||
  process.env.WORKERS_CI === "1" ||
  process.env.HOME === "/opt/buildhome" ||
  process.cwd().startsWith("/opt/buildhome");

function run(command) {
  const result = spawnSync(command, {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  process.exit(result.status === null ? 1 : result.status);
}

// Default / Vercel / nested OpenNext call → plain Next build only
if (fs.existsSync(lockPath) || onVercel || !onCloudflare) {
  run("npx next build");
}

// Cloudflare CI only (when invoked as `npm run build:cf`)

fs.writeFileSync(lockPath, "1");
try {
  run("npx opennextjs-cloudflare build");
} finally {
  try {
    fs.unlinkSync(lockPath);
  } catch {
    // ignore
  }
}
