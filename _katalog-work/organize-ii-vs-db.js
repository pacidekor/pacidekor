/**
 * Process produktyznovu/ii — number + dHash vs DB → NA_ESHOPU / NENI_NA_ESHOPU
 * node _katalog-work/organize-ii-vs-db.js
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..", "katalog_raw");
const II_ROOT = path.join(ROOT, "produktyznovu", "ii");
const DB = path.join(ROOT, "databaze_co_uz_mame");
const REPORT = path.join(__dirname, "organize-ii-report.tsv");

const THRESH = 10;
const HASH_W = 9;
const HASH_H = 8;
const IMG_RE = /\.(jpe?g|png|webp|gif)$/i;

function ensure(d) {
  fs.mkdirSync(d, { recursive: true });
}

function safe(name) {
  return String(name)
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function listTopImages(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && IMG_RE.test(e.name))
    .map((e) => path.join(dir, e.name));
}

function walkImages(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let ents;
    try {
      ents = fs.readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of ents) {
      const p = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (IMG_RE.test(e.name)) out.push(p);
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
      if (data[y * HASH_W + x] > data[y * HASH_W + x + 1]) bits |= 1n << bit;
      bit += 1n;
    }
  }
  return bits;
}

function hamming(a, b) {
  let x = a ^ b;
  let n = 0;
  while (x) {
    x &= x - 1n;
    n += 1;
  }
  return n;
}

async function buildDbHashes() {
  console.log("Hashuji DB…");
  const files = walkImages(DB);
  const hashes = [];
  for (let i = 0; i < files.length; i++) {
    if ((i + 1) % 250 === 0) console.log("  DB", i + 1, "/", files.length);
    try {
      hashes.push({ file: files[i], hash: await dhash(files[i]) });
    } catch {
      /* skip */
    }
  }
  console.log("DB OK:", hashes.length, "/", files.length);
  return hashes;
}

async function bestDist(images, dbHashes) {
  let best = 999;
  let local = null;
  let dbFile = null;
  for (const img of images) {
    let h;
    try {
      h = await dhash(img);
    } catch {
      continue;
    }
    for (const row of dbHashes) {
      const d = hamming(h, row.hash);
      if (d < best) {
        best = d;
        local = img;
        dbFile = row.file;
      }
      if (best === 0) return { best, local, dbFile };
    }
  }
  return { best, local, dbFile };
}

/** Find product folders: either II-original/N or already numbered at ii/ top */
function collectProductFolders() {
  const nested = path.join(II_ROOT, "II-original");
  if (fs.existsSync(nested) && fs.statSync(nested).isDirectory()) {
    return fs
      .readdirSync(nested, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => ({
        absPath: path.join(nested, d.name),
        origName: d.name,
      }));
  }

  // already flattened?
  return fs
    .readdirSync(II_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "II-original")
    .map((d) => {
      const cleaned = d.name
        .replace(/\s+(NA_ESHOPU|NENI_NA_ESHOPU|NEJISTE)$/i, "")
        .trim();
      const m = cleaned.match(/^\d{3}\s+(.+)$/);
      return {
        absPath: path.join(II_ROOT, d.name),
        origName: m ? m[1] : d.name,
      };
    });
}

function flattenAndNumber(items) {
  // Move all to ii/ top with temp names, then number
  const temps = [];
  items
    .slice()
    .sort((a, b) =>
      a.origName.localeCompare(b.origName, "sk", { numeric: true }),
    )
    .forEach((it, i) => {
      const tmp = path.join(II_ROOT, `__tmp_${String(i + 1).padStart(4, "0")}`);
      fs.renameSync(it.absPath, tmp);
      temps.push({ tmp, origName: it.origName });
    });

  // remove empty II-original if left
  const nested = path.join(II_ROOT, "II-original");
  if (fs.existsSync(nested)) {
    try {
      fs.rmdirSync(nested);
    } catch {
      /* not empty – leave */
    }
  }

  return temps.map((t, i) => {
    const num = String(i + 1).padStart(3, "0");
    const named = path.join(II_ROOT, `${num} ${safe(t.origName)}`);
    fs.renameSync(t.tmp, named);
    return { num, absPath: named, origName: t.origName };
  });
}

async function main() {
  if (!fs.existsSync(II_ROOT)) throw new Error("Chybí " + II_ROOT);
  if (!fs.existsSync(DB)) throw new Error("Chybí " + DB);

  ensure(II_ROOT);

  let items = collectProductFolders();
  console.log("II produktových složek:", items.length);

  const needsNumber =
    items.some((it) => it.absPath.includes("II-original")) ||
    !items.every((it) => /^\d{3}\s/.test(path.basename(it.absPath)));

  if (needsNumber) {
    console.log("Flatten + číslování…");
    items = flattenAndNumber(items);
  } else {
    console.log("Už očíslováno — beru aktuální názvy");
  }

  const dbHashes = await buildDbHashes();

  console.log("Označuji…");
  const rows = [];
  let na = 0;
  let neni = 0;

  for (const it of items) {
    const images = listTopImages(it.absPath);
    const { best, local, dbFile } = await bestDist(images, dbHashes);
    const status = best <= THRESH ? "NA_ESHOPU" : "NENI_NA_ESHOPU";
    if (status === "NA_ESHOPU") na += 1;
    else neni += 1;

    const parent = path.dirname(it.absPath);
    const cleaned = path
      .basename(it.absPath)
      .replace(/\s+(NA_ESHOPU|NENI_NA_ESHOPU|NEJISTE)$/i, "")
      .trim();
    const newName = `${cleaned} ${status}`;
    const newPath = path.join(parent, newName);
    if (it.absPath !== newPath) {
      if (fs.existsSync(newPath)) throw new Error("exists " + newName);
      fs.renameSync(it.absPath, newPath);
    }

    fs.writeFileSync(
      path.join(newPath, "MATCH.txt"),
      [
        "section: ii",
        `status: ${status}`,
        `distance: ${best}`,
        `threshold: <=${THRESH}`,
        `orig: ${it.origName}`,
        `images: ${images.length}`,
        `local: ${local ? path.relative(II_ROOT, local) : "-"}`,
        `db: ${dbFile ? path.relative(DB, dbFile) : "-"}`,
        "",
      ].join("\n"),
      "utf8",
    );

    rows.push({
      folder: newName,
      orig: it.origName,
      status,
      distance: best,
      images: images.length,
    });

    console.log(
      status.padEnd(14),
      `d=${String(best).padStart(2)}`,
      `imgs=${String(images.length).padStart(3)}`,
      newName,
    );
  }

  fs.writeFileSync(
    REPORT,
    [
      "folder\torig\tstatus\tdistance\timages",
      ...rows.map((r) =>
        [r.folder, r.orig, r.status, r.distance, r.images].join("\t"),
      ),
    ].join("\n") + "\n",
    "utf8",
  );

  fs.writeFileSync(
    path.join(II_ROOT, "README.txt"),
    [
      "ii/ — Drive -II guláš vs e-shop (dHash)",
      "",
      `Složek: ${rows.length}`,
      `NA_ESHOPU: ${na}`,
      `NENI_NA_ESHOPU: ${neni}`,
      `Práh: distance <= ${THRESH}`,
      "",
      "Report: _katalog-work/organize-ii-report.tsv",
      "",
    ].join("\n"),
    "utf8",
  );

  console.log("\n=== SOUHRN II ===");
  console.log({ total: rows.length, NA_ESHOPU: na, NENI_NA_ESHOPU: neni });
  console.log("Report:", REPORT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
