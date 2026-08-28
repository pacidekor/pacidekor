/**
 * Organize Drive dump vs DB images.
 * node _katalog-work/organize-drive-vs-db.js
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..", "katalog_raw");
const SRC = path.join(ROOT, "produktyznovu");
const DB = path.join(ROOT, "databaze_co_uz_mame");
const PREF_DIR = path.join(SRC, "prefotit");
const II_DIR = path.join(SRC, "ii");
const REPORT = path.join(__dirname, "organize-drive-report.tsv");

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

function moveInto(from, destDir, destName) {
  ensure(destDir);
  let dest = path.join(destDir, destName);
  let n = 2;
  while (fs.existsSync(dest)) {
    dest = path.join(destDir, `${destName}__${n}`);
    n += 1;
  }
  fs.renameSync(from, dest);
  return dest;
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

function numberIn(parent, items) {
  const sorted = [...items].sort((a, b) =>
    a.origName.localeCompare(b.origName, "sk", { numeric: true }),
  );
  const temps = [];
  sorted.forEach((it, i) => {
    const tmp = path.join(parent, `__tmp_${String(i + 1).padStart(4, "0")}`);
    fs.renameSync(it.absPath, tmp);
    temps.push({ tmp, origName: it.origName });
  });
  return temps.map((t, i) => {
    const num = String(i + 1).padStart(3, "0");
    const named = path.join(parent, `${num} ${safe(t.origName)}`);
    fs.renameSync(t.tmp, named);
    return { num, absPath: named, origName: t.origName };
  });
}

async function labelAll(items, dbHashes, section) {
  const rows = [];
  for (const it of items) {
    const images = listTopImages(it.absPath);
    const { best, local, dbFile } = await bestDist(images, dbHashes);
    const status = best <= THRESH ? "NA_ESHOPU" : "NENI_NA_ESHOPU";

    const parent = path.dirname(it.absPath);
    const cleaned = path
      .basename(it.absPath)
      .replace(/\s+(NA_ESHOPU|NENI_NA_ESHOPU|NEJISTE)$/i, "")
      .trim();
    const newName = `${cleaned} ${status}`;
    const newPath = path.join(parent, newName);
    if (it.absPath !== newPath) {
      if (fs.existsSync(newPath)) throw new Error("exists: " + newName);
      fs.renameSync(it.absPath, newPath);
    }

    fs.writeFileSync(
      path.join(newPath, "MATCH.txt"),
      [
        `section: ${section}`,
        `status: ${status}`,
        `distance: ${best}`,
        `threshold: <=${THRESH}`,
        `orig: ${it.origName}`,
        `images: ${images.length}`,
        `local: ${local ? path.relative(SRC, local) : "-"}`,
        `db: ${dbFile ? path.relative(DB, dbFile) : "-"}`,
        "",
      ].join("\n"),
      "utf8",
    );

    rows.push({
      section,
      folder: newName,
      orig: it.origName,
      status,
      distance: best,
      images: images.length,
    });

    console.log(
      section.padEnd(9),
      status.padEnd(14),
      `d=${String(best).padStart(2)}`,
      `imgs=${String(images.length).padStart(2)}`,
      newName,
    );
  }
  return rows;
}

async function main() {
  if (!fs.existsSync(SRC)) throw new Error("Chybí " + SRC);
  if (!fs.existsSync(DB)) throw new Error("Chybí " + DB);

  const topDirs = fs
    .readdirSync(SRC, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const alreadySplit =
    topDirs.includes("prefotit") && topDirs.some((n) => /^\d{3}\s/.test(n));

  let normalItems = [];
  let prefItems = [];

  if (!alreadySplit) {
    console.log("=== FÁZE 1: Prefotit / normal / ii ===");
    ensure(PREF_DIR);
    ensure(II_DIR);

    const normals = [];
    const prefs = [];

    for (const name of topDirs) {
      if (name === "prefotit" || name === "ii") continue;
      const from = path.join(SRC, name);

      if (name === "-II") {
        moveInto(from, II_DIR, "II-original");
        console.log("-> ii/II-original");
        continue;
      }

      if (/prefot/i.test(name)) {
        const dest = moveInto(from, PREF_DIR, safe(name));
        prefs.push({ absPath: dest, origName: name });
        console.log("-> prefotit/", name);
      } else {
        normals.push({ absPath: from, origName: name });
      }
    }

    console.log("Čísluji normal:", normals.length);
    normalItems = numberIn(SRC, normals);
    console.log("Čísluji prefotit:", prefs.length);
    prefItems = numberIn(PREF_DIR, prefs);
  } else {
    console.log("=== Už rozděleno — beru aktuální složky ===");
    for (const name of topDirs) {
      if (name === "prefotit" || name === "ii") continue;
      const absPath = path.join(SRC, name);
      const cleaned = name
        .replace(/\s+(NA_ESHOPU|NENI_NA_ESHOPU|NEJISTE)$/i, "")
        .trim();
      const m = cleaned.match(/^(\d{3})\s+(.+)$/);
      normalItems.push({
        absPath,
        origName: m ? m[2] : name,
      });
    }
    if (fs.existsSync(PREF_DIR)) {
      for (const name of fs.readdirSync(PREF_DIR)) {
        const absPath = path.join(PREF_DIR, name);
        if (!fs.statSync(absPath).isDirectory()) continue;
        const cleaned = name
          .replace(/\s+(NA_ESHOPU|NENI_NA_ESHOPU|NEJISTE)$/i, "")
          .trim();
        const m = cleaned.match(/^(\d{3})\s+(.+)$/);
        prefItems.push({
          absPath,
          origName: m ? m[2] : name,
        });
      }
    }
  }

  const dbHashes = await buildDbHashes();

  console.log("=== FÁZE 2: normal ===");
  const rowsN = await labelAll(normalItems, dbHashes, "normal");
  console.log("=== FÁZE 3: prefotit ===");
  const rowsP = await labelAll(prefItems, dbHashes, "prefotit");

  const all = [...rowsN, ...rowsP];
  const summary = {
    normal_NA: rowsN.filter((r) => r.status === "NA_ESHOPU").length,
    normal_NENI: rowsN.filter((r) => r.status === "NENI_NA_ESHOPU").length,
    pref_NA: rowsP.filter((r) => r.status === "NA_ESHOPU").length,
    pref_NENI: rowsP.filter((r) => r.status === "NENI_NA_ESHOPU").length,
  };

  fs.writeFileSync(
    REPORT,
    [
      "section\tfolder\torig\tstatus\tdistance\timages",
      ...all.map((r) =>
        [r.section, r.folder, r.orig, r.status, r.distance, r.images].join("\t"),
      ),
    ].join("\n") + "\n",
    "utf8",
  );

  fs.writeFileSync(
    path.join(SRC, "README.txt"),
    [
      "Drive export vs e-shop (dHash)",
      "",
      "001+ … běžné složky + NA_ESHOPU / NENI_NA_ESHOPU",
      "prefotit/ … Prefotit složky + stejné značky",
      "ii/ … -II guláš",
      "",
      `Práh NA_ESHOPU: distance <= ${THRESH}`,
      "",
      `normal NA_ESHOPU:       ${summary.normal_NA}`,
      `normal NENI_NA_ESHOPU:  ${summary.normal_NENI}`,
      `prefotit NA_ESHOPU:     ${summary.pref_NA}`,
      `prefotit NENI_NA_ESHOPU:${summary.pref_NENI}`,
      "",
      "Detail: _katalog-work/organize-drive-report.tsv",
      "",
    ].join("\n"),
    "utf8",
  );

  console.log("\n=== SOUHRN ===");
  console.log(summary);
  console.log("Report:", REPORT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
