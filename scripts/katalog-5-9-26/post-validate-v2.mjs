import fs from "node:fs";
import path from "node:path";

const root = "katalog_raw/noveprodukty5.9.26-ready-v2";
const dirs = fs
  .readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^[0-9]+$/.test(d.name))
  .map((d) => d.name)
  .sort((a, b) => Number(a) - Number(b));

console.log("count", dirs.length);
console.log(
  "66 files",
  fs
    .readdirSync(path.join(root, "66"))
    .filter((f) => f.endsWith(".webp"))
    .sort((a, b) => parseInt(a) - parseInt(b))
    .join(","),
);
console.log("arch", fs.readdirSync(path.join(root, "_archived")).join(","));

const g = JSON.parse(
  fs.readFileSync("scripts/katalog-5-9-26/v2-reports/spolecna-galerie.json", "utf8"),
);
console.log("common entries", g.length);
console.log(JSON.stringify(g.filter((x) => x.action === "common-gallery-summary"), null, 2));

const tax = { Stuhy: 0, "Floristické potreby": 0, Prírodniny: 0, other: 0 };
const emptyFarby = [];
const colorInName = [];
const COLOR =
  /\b(biela|ružov|fialov|zelen|krémov|oranž|žlt|modr|hned|siv|vínov|bordov|staroruž|losos|čier|marhuľ|hrdzav|zlat|čír)\w*/i;

for (const id of dirs) {
  const t = fs.readFileSync(path.join(root, id, "info.txt"), "utf8");
  const name = (t.match(/^Názov:\s*(.+)$/m) || [])[1] || "";
  const farby = (t.match(/^Farby:\s*(.*)$/m) || [])[1] || "";
  const sub = (t.match(/^Subkategória:\s*(.+)$/m) || [])[1] || "";
  if (tax[sub] != null) tax[sub]++;
  else tax.other++;
  if (!farby.trim()) emptyFarby.push(id);
  if (COLOR.test(name)) colorInName.push(`${id}:${name}`);
}
console.log(tax);
console.log("emptyFarby", emptyFarby);
console.log("colorInName", colorInName);

// Fix 147 číry
const p147 = path.join(root, "147", "info.txt");
let t147 = fs.readFileSync(p147, "utf8");
if (/Farby:\s*číry/i.test(t147)) {
  t147 = t147.replace(/^Farby:.*$/m, "Farby:");
  fs.writeFileSync(p147, t147);
  console.log("fixed 147 číry -> empty Farby; photo 1 stays as file, mapped as pending");
}
