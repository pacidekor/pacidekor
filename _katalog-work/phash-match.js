/**
 * Perceptual hash match: katalog_raw/list vs databaze_co_uz_mame
 * Renames list folders to append: NA_ESHOPU | NEJISTE | NENI_NA_ESHOPU
 *
 * node _katalog-work/phash-match.js
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..", "katalog_raw");
const LIST = path.join(ROOT, "list");
const DB = path.join(ROOT, "databaze_co_uz_mame");
const REPORT = path.join(__dirname, "phash-report.tsv");
const REPORT_JSON = path.join(__dirname, "phash-report.json");

// 64-bit dHash (8x9 grayscale). Lower = more similar.
const THRESH_MATCH = 10; // NA_ESHOPU
const THRESH_MAYBE = 16; // NEJISTE
const HASH_W = 9;
const HASH_H = 8;

const IMG_RE = /\.(jpe?g|png|webp|gif)$/i;
const STATUS_RE = /\s+(NA_ESHOPU|NEJISTE|NENI_NA_ESHOPU)$/i;

function walkImages(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    for (const ent of fs.readdirSync(cur, { withFileTypes: true })) {
      const p = path.join(cur, ent.name);
      if (ent.isDirectory()) stack.push(p);
      else if (IMG_RE.test(ent.name)) out.push(p);
    }
  }
  return out;
}

async function dhash(file) {
  const { data } = await sharp(file)
    .rotate()
    .greyscale()
    .resize(HASH_W, HASH_H, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let bits = 0n;
  let bit = 0n;
  for (let y = 0; y < HASH_H; y++) {
    for (let x = 0; x < HASH_W - 1; x++) {
      const left = data[y * HASH_W + x];
      const right = data[y * HASH_W + x + 1];
      if (left > right) bits |= 1n << bit;
      bit++;
    }
  }
  return bits;
}

function hamming(a, b) {
  let x = a ^ b;
  let n = 0;
  while (x) {
    x &= x - 1n;
    n++;
  }
  return n;
}

function statusFromDistance(d) {
  if (d <= THRESH_MATCH) return "NA_ESHOPU";
  if (d <= THRESH_MAYBE) return "NEJISTE";
  return "NENI_NA_ESHOPU";
}

function stripStatus(name) {
  return name.replace(STATUS_RE, "").trim();
}

async function main() {
  console.log("Hashuji DB export…");
  const dbFiles = walkImages(DB);
  console.log("DB fotek:", dbFiles.length);
  if (dbFiles.length === 0) throw new Error("Žádné fotky v databaze_co_uz_mame");

  const dbHashes = [];
  let i = 0;
  for (const file of dbFiles) {
    i++;
    if (i % 200 === 0) console.log("  DB", i, "/", dbFiles.length);
    try {
      const hash = await dhash(file);
      dbHashes.push({ file, hash });
    } catch (err) {
      console.warn("  skip DB", path.basename(file), err.message);
    }
  }
  console.log("DB hash hotovo:", dbHashes.length);

  const dirs = fs
    .readdirSync(LIST, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b, "sk", { numeric: true }));

  console.log("List složek:", dirs.length);

  const rows = [];
  const counts = { NA_ESHOPU: 0, NEJISTE: 0, NENI_NA_ESHOPU: 0 };

  for (const name of dirs) {
    const dirPath = path.join(LIST, name);
    const imgs = walkImages(dirPath);
    let best = { dist: 999, local: null, db: null };

    for (const img of imgs) {
      let hash;
      try {
        hash = await dhash(img);
      } catch {
        continue;
      }
      for (const db of dbHashes) {
        const dist = hamming(hash, db.hash);
        if (dist < best.dist) {
          best = {
            dist,
            local: path.relative(LIST, img),
            db: path.relative(DB, db.file),
          };
        }
        if (dist === 0) break;
      }
      if (best.dist === 0) break;
    }

    const status = statusFromDistance(best.dist);
    counts[status]++;

    const base = stripStatus(name);
    const newName = `${base} ${status}`;
    const dest = path.join(LIST, newName);

    if (name !== newName) {
      if (fs.existsSync(dest)) {
        throw new Error(`Cíl už existuje: ${newName}`);
      }
      fs.renameSync(dirPath, dest);
    }

    // write match note
    fs.writeFileSync(
      path.join(LIST, newName, "MATCH.txt"),
      [
        `status: ${status}`,
        `best_distance: ${best.dist}`,
        `threshold_match: <=${THRESH_MATCH}`,
        `threshold_maybe: <=${THRESH_MAYBE}`,
        `local: ${best.local || "-"}`,
        `db: ${best.db || "-"}`,
        "",
      ].join("\n"),
      "utf8",
    );

    rows.push({
      folder: newName,
      base,
      status,
      dist: best.dist,
      local: best.local,
      db: best.db,
      images: imgs.length,
    });

    console.log(
      status.padEnd(14),
      `d=${String(best.dist).padStart(2)}`,
      base,
      `(${imgs.length} fotek)`,
    );
  }

  const tsv = [
    "folder\tbase\tstatus\tdistance\tlocal\tdb\timages",
    ...rows.map((r) =>
      [r.folder, r.base, r.status, r.dist, r.local || "", r.db || "", r.images].join(
        "\t",
      ),
    ),
  ].join("\n");
  fs.writeFileSync(REPORT, tsv + "\n", "utf8");
  fs.writeFileSync(REPORT_JSON, JSON.stringify({ counts, rows }, null, 2), "utf8");

  console.log("\n=== SOUHRN ===");
  console.log(counts);
  console.log("Report:", REPORT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
