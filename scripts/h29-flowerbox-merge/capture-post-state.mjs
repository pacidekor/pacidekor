/**
 * DEPRECATED for creating revert expectations.
 *
 * Post-state for an activation MUST be captured inside the activate transaction
 * via run-activate-capture.mjs → activations/<id>/backup-post.json (write-once).
 *
 * This script refuses to overwrite results/backup-post.json and refuses to
 * invent expectations from a later DB read for an already-completed activation.
 *
 * Exit 2 = blocked / refuse.
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const legacyPath = join(__dirname, "results", "backup-post.json");

console.error(
  "STOP: late DB capture is disabled. Use run-activate-capture.mjs so post-state is taken inside the activate transaction (rows still locked) into activations/<id>/.",
);
if (existsSync(legacyPath)) {
  console.error(
    `Existing ${legacyPath} will NOT be overwritten (immutable).`,
  );
}
process.exit(2);
