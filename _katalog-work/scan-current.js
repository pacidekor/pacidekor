const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "katalog_raw", "produktyznovu");

function listImages(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && /\.(jpe?g|png|webp)$/i.test(d.name))
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function readZdroj(dir) {
  const p = path.join(dir, "zdroj.txt");
  if (!fs.existsSync(p)) return "";
  const t = fs.readFileSync(p, "utf8");
  const m = t.match(/povodni:\s*(.+)/i);
  return m ? m[1].trim() : t.trim();
}

const dirs = fs
  .readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort((a, b) => a.localeCompare(b, "sk", { numeric: true }));

const rows = [];
for (const name of dirs) {
  const dir = path.join(ROOT, name);
  const images = listImages(dir);
  const subdirs = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const zdroj = readZdroj(dir);
  const isPrefot =
    /prefot/i.test(name) || /prefot/i.test(zdroj);
  rows.push({
    name,
    zdroj,
    count: images.length,
    images,
    subdirs,
    isPrefot,
  });
}

fs.writeFileSync(
  path.join(__dirname, "_scan.json"),
  JSON.stringify(rows, null, 2),
  "utf8",
);

const pref = rows.filter((r) => r.isPrefot);
const multi = rows.filter(
  (r) => r.count > 3 && !r.isPrefot && r.subdirs.length === 0,
);
const ok3 = rows.filter((r) => r.count === 3 && !r.isPrefot);
const other = rows.filter(
  (r) =>
    !r.isPrefot &&
    r.subdirs.length === 0 &&
    r.count !== 3 &&
    r.count <= 3,
);
const nested = rows.filter((r) => r.subdirs.length > 0);

console.log("dirs", rows.length);
console.log("PREFOTIT", pref.length);
pref.forEach((r) => console.log(" ", r.name, r.count, "|", r.zdroj));
console.log("MULTI>3", multi.length);
multi
  .sort((a, b) => b.count - a.count)
  .forEach((r) => console.log(" ", r.count, r.name, "|", r.zdroj));
console.log("OK3", ok3.length);
console.log("OTHER0-2", other.length);
other.forEach((r) => console.log(" ", r.count, r.name));
console.log("NESTED", nested.length);
nested.forEach((r) =>
  console.log(" ", r.name, "subs", r.subdirs.length),
);
