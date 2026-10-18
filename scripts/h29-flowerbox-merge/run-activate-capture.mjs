/**
 * Run activate.sql and persist the in-transaction h29_post_snapshot into a
 * write-once activation folder. Never overwrites an existing activation.
 *
 *   activations/<id>/
 *     backup-pre.json   (copy of canonical backup-pre)
 *     backup-post.json  (snapshot from activate transaction)
 *     revert-from-backup.sql (via build-revert-from-backup.mjs)
 *
 * Env: PGHOST PGPORT PGUSER PGDATABASE (default h29_verify @ 54329)
 * Optional: H29_ACTIVATION_ID=custom-id
 */
import { execFileSync, spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { validatePostAgainstApproved } from "./h29-post-validate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const psql =
  process.env.PSQL ||
  "C:\\Users\\tomas\\scoop\\apps\\postgresql\\current\\bin\\psql.exe";

const pg = {
  host: process.env.PGHOST || "127.0.0.1",
  port: process.env.PGPORT || "54329",
  user: process.env.PGUSER || "postgres",
  database: process.env.PGDATABASE || "h29_verify",
};

const activationsRoot = join(__dirname, "activations");
mkdirSync(activationsRoot, { recursive: true });

const id =
  process.env.H29_ACTIVATION_ID ||
  `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomBytes(3).toString("hex")}`;
const dir = join(activationsRoot, id);

if (existsSync(dir)) {
  console.error(`STOP: activation dir already exists: ${dir}`);
  process.exit(1);
}
mkdirSync(dir, { recursive: false });

const preSrc = join(__dirname, "backup-pre.json");
const preDst = join(dir, "backup-pre.json");
copyFileSync(preSrc, preDst);

let out;
try {
  out = execFileSync(
    psql,
    [
      "-h",
      pg.host,
      "-p",
      pg.port,
      "-U",
      pg.user,
      "-d",
      pg.database,
      "-v",
      "ON_ERROR_STOP=1",
      "-t",
      "-A",
      "-f",
      join(__dirname, "activate.sql"),
    ],
    {
      encoding: "utf8",
      env: { ...process.env, PGCLIENTENCODING: "UTF8" },
    },
  );
} catch (err) {
  console.error("STOP: activate failed —", err.stderr || err.message);
  process.exit(1);
}

// psql -t -A prints the SELECT result as one JSON line (notices go to stderr).
const lines = out
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter(Boolean);
const jsonLine = lines.find((l) => l.startsWith("{") && l.includes("capturedInTransaction"));
if (!jsonLine) {
  console.error(
    "STOP: activate did not return h29_post_snapshot (in-transaction capture missing)",
  );
  console.error("stdout:", out.slice(0, 500));
  process.exit(1);
}

const post = JSON.parse(jsonLine);
const postPath = join(dir, "backup-post.json");
if (existsSync(postPath)) {
  console.error("STOP: backup-post.json already exists in activation dir");
  process.exit(1);
}

const pre = JSON.parse(readFileSync(preDst, "utf8"));
const approved = JSON.parse(
  readFileSync(join(__dirname, "approved-manifest.json"), "utf8"),
);
const check = validatePostAgainstApproved(post, pre, approved);
if (!check.ok) {
  console.error("STOP: captured post does not match approved — leaving incomplete activation dir:");
  for (const e of check.errors) console.error(" -", e);
  writeFileSync(
    join(dir, "REJECTED-post.json"),
    JSON.stringify({ post, errors: check.errors }, null, 2),
    "utf8",
  );
  process.exit(1);
}

writeFileSync(postPath, JSON.stringify(post, null, 2), "utf8");
console.log("Wrote", postPath);

const build = spawnSync(
  process.execPath,
  [
    join(__dirname, "build-revert-from-backup.mjs"),
    "--activation-dir",
    dir,
  ],
  { encoding: "utf8" },
);
process.stdout.write(build.stdout || "");
process.stderr.write(build.stderr || "");
if (build.status !== 0) process.exit(build.status ?? 1);

writeFileSync(
  join(dir, "META.json"),
  JSON.stringify(
    {
      id,
      createdAt: new Date().toISOString(),
      capturedInTransaction: true,
      note: "Immutable activation artifacts. Do not overwrite. Later DB reads must not replace backup-post.",
    },
    null,
    2,
  ),
  "utf8",
);
console.log("Activation folder:", dir);
