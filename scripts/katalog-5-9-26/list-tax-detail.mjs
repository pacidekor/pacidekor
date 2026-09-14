import fs from "node:fs";
import path from "node:path";

const root = "katalog_raw/noveprodukty5.9.26-ready-v4";
const groups = {};

for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
  if (!ent.isDirectory()) continue;
  if (/hotovo/i.test(ent.name)) {
    console.log("skip", ent.name);
    continue;
  }
  if (!/^\d+$/.test(ent.name)) continue;
  const t = fs.readFileSync(path.join(root, ent.name, "info.txt"), "utf8");
  const g = (k) => {
    const m = t.match(new RegExp(`^${k}:\\s*(.*)$`, "m"));
    return m ? m[1].trim() : "";
  };
  const key = `${g("Kategória")} / ${g("Subkategória")} / ${g("Druh")}`;
  (groups[key] = groups[key] || []).push(`${ent.name}:${g("Názov")}`);
}

for (const k of Object.keys(groups).sort()) {
  console.log(`\n${k} (${groups[k].length})`);
  for (const line of groups[k]) console.log(" ", line);
}
