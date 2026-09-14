import fs from "node:fs";
import path from "node:path";

const root = "katalog_raw/noveprodukty5.9.26-ready-v4";
function parse(t) {
  const d = {};
  for (const line of t.replace(/\r\n/g, "\n").trim().split("\n")) {
    const i = line.indexOf(":");
    if (i < 0) continue;
    d[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return d;
}
const counts = new Map();
for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
  if (!ent.isDirectory() || /hotovo/i.test(ent.name) || !/^\d+$/.test(ent.name))
    continue;
  const info = parse(fs.readFileSync(path.join(root, ent.name, "info.txt"), "utf8"));
  const key = `${info["Kategória"] || ""} / ${info["Subkategória"] || "(bez sub)"}`;
  counts.set(key, (counts.get(key) || 0) + 1);
}
for (const [k, v] of [...counts.entries()].sort()) console.log(`${v}\t${k}`);
