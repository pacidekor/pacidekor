/**
 * Cloudflare CI deploy command — keeps dashboard Variables/Secrets.
 * Set CF "Deploy command" to: node scripts/cf-deploy.mjs
 */
import { spawnSync } from "node:child_process";

const result = spawnSync(
  "npx",
  ["wrangler", "deploy", "--keep-vars"],
  { stdio: "inherit", shell: true, env: process.env },
);

process.exit(result.status === null ? 1 : result.status);
