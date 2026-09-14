import fs from "node:fs";
import path from "node:path";

const root = "katalog_raw/noveprodukty5.9.26-ready-v4";
const out = [];
for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
  if (!ent.isDirectory() || !/^\d+$/.test(ent.name)) continue;
  const t = fs.readFileSync(path.join(root, ent.name, "info.txt"), "utf8");
  const name = (t.match(/^Názov:\s*(.*)$/m) || [])[1];
  const desc = (t.match(/^Popis:\s*(.*)$/m) || [])[1];
  out.push(`${ent.name}\t${name}\t${desc}`);
}
out.sort((a, b) => Number(a.split("\t")[0]) - Number(b.split("\t")[0]));
fs.writeFileSync("scripts/katalog-5-9-26/v4-all-descs.tsv", out.join("\n"), "utf8");
console.log(out.length);
