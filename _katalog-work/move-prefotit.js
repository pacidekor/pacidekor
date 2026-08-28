const fs = require("fs");
const path = require("path");

const BASE = path.join(__dirname, "..", "katalog_raw");
const SRC = path.join(BASE, "produktyznovu");
const PREF = path.join(BASE, "prefotit");
const II = path.join(BASE, "ii-gulas");

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

function safeMove(from, toDir, preferredName) {
  ensureDir(toDir);
  let name = preferredName.replace(/[<>:"/\\|?*]/g, "-").trim() || "item";
  let dest = path.join(toDir, name);
  let i = 2;
  while (fs.existsSync(dest)) {
    dest = path.join(toDir, `${name}__${i}`);
    i++;
  }
  fs.renameSync(from, dest);
  return dest;
}

const scan = JSON.parse(
  fs.readFileSync(path.join(__dirname, "_scan.json"), "utf8"),
);

ensureDir(PREF);
ensureDir(II);

let movedPref = 0;
for (const row of scan) {
  if (!row.isPrefot) continue;
  const from = path.join(SRC, row.name);
  if (!fs.existsSync(from)) {
    console.log("MISSING", row.name);
    continue;
  }
  const label = row.zdroj || row.name;
  const dest = safeMove(from, PREF, label);
  console.log("PREFOTIT ->", path.basename(dest));
  movedPref++;
}

const iiFolder = scan.find((r) => r.subdirs && r.subdirs.length > 50);
if (iiFolder) {
  const from = path.join(SRC, iiFolder.name);
  if (fs.existsSync(from)) {
    const dest = safeMove(from, II, "II-original");
    console.log("II ->", dest);
  }
}

console.log("Moved PREFOTIT:", movedPref);
