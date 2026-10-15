/**
 * Local one-shot: create display-sized banner WebPs from squooshed sources.
 * Never overwrites originals or squooshed inputs.
 *
 * Usage:
 *   node scripts/optimize-banners-display.mjs           # all
 *   node scripts/optimize-banners-display.mjs --dry-run
 *   node scripts/optimize-banners-display.mjs --only=bannerdusickydesktop,bannerdusickymobile
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "public/bannery/bannery_squooshed");
const OUT_DIR = path.join(ROOT, "public/bannery/display");
const NLCTA_SRC = path.join(ROOT, "public/nlcta.webp");
const NLCTA_OUT = path.join(ROOT, "public/nlcta-display.webp");

/** Max long edge by viewport role — covers ~DPR 2–3 without shipping 10k+ px. */
const TARGETS = {
  desktop: 2880,
  /** Higher than bare 3×400 CSS — keeps overlaid banner text crisp. */
  mobile: 1600,
  newsletter: 1920,
};

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const onlyArg = [...args].find((a) => a.startsWith("--only="));
const only = onlyArg
  ? new Set(
      onlyArg
        .slice("--only=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    )
  : null;

function roleForName(name) {
  if (name.includes("mobile")) return "mobile";
  return "desktop";
}

async function convertFile(src, out, maxWidth, label, role = "desktop") {
  const inputMeta = await sharp(src).metadata();
  const width = inputMeta.width ?? 0;
  const targetW = Math.min(width, maxWidth);
  const inKb = Math.round(fs.statSync(src).size / 1024);

  console.log(
    `${label}: ${width}px → ${targetW}px (src ${inKb} KB)${dryRun ? " [dry-run]" : ""}`,
  );

  if (dryRun) return { outKb: null, targetW };

  await fs.promises.mkdir(path.dirname(out), { recursive: true });
  await sharp(src)
    .rotate()
    .resize({
      width: targetW,
      withoutEnlargement: true,
      fit: "inside",
    })
    .webp({
      quality: role === "mobile" ? 90 : 86,
      alphaQuality: 90,
      effort: 4,
      smartSubsample: true,
    })
    .toFile(out);

  const outKb = Math.round(fs.statSync(out).size / 1024);
  console.log(`  → ${path.relative(ROOT, out)} (${outKb} KB)`);
  return { outKb, targetW };
}

async function main() {
  const files = fs
    .readdirSync(SRC_DIR)
    .filter((f) => f.endsWith(".webp"))
    .sort();

  let planned = 0;
  for (const file of files) {
    const base = file.replace(/\.webp$/i, "");
    if (only && !only.has(base) && !only.has(file)) continue;
    planned += 1;
    const role = roleForName(file);
    await convertFile(
      path.join(SRC_DIR, file),
      path.join(OUT_DIR, file),
      TARGETS[role],
      file,
      role,
    );
  }

  if (!only || only.has("nlcta") || only.has("nlcta.webp")) {
    if (fs.existsSync(NLCTA_SRC)) {
      planned += 1;
      await convertFile(NLCTA_SRC, NLCTA_OUT, TARGETS.newsletter, "nlcta.webp");
    }
  }

  if (planned === 0) {
    console.log("Nothing matched.");
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
