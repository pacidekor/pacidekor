import fs from "node:fs";
import path from "node:path";

const root = "katalog_raw/noveprodukty5.9.26-ready-v4";
const byCatSub = new Map();
const byCat = new Map();

for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
  if (!ent.isDirectory() || !/^\d+$/.test(ent.name)) continue;
  const t = fs.readFileSync(path.join(root, ent.name, "info.txt"), "utf8");
  const g = (k) => {
    const m = t.match(new RegExp(`^${k}:\\s*(.*)$`, "m"));
    return m ? m[1].trim() : "";
  };
  const cat = g("Kategória");
  const sub = g("Subkategória");
  const druh = g("Druh");
  const key = `${cat} / ${sub}`;
  if (!byCatSub.has(key)) byCatSub.set(key, { count: 0, druhy: new Set(), ids: [] });
  const row = byCatSub.get(key);
  row.count += 1;
  row.druhy.add(druh);
  row.ids.push(ent.name);
  if (!byCat.has(cat)) byCat.set(cat, new Set());
  byCat.get(cat).add(sub);
}

console.log("=== Kategorie a subkategorie ve v4 ===\n");
for (const [cat, subs] of [...byCat.entries()].sort()) {
  console.log(cat);
  for (const sub of [...subs].sort()) {
    const row = byCatSub.get(`${cat} / ${sub}`);
    console.log(`  - ${sub} (${row.count} produktů)`);
  }
  console.log("");
}

console.log("=== Stuhy detail (produkty s 'stuha' v názvu/druhu nebo sub Stuhy) ===\n");
for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
  if (!ent.isDirectory() || !/^\d+$/.test(ent.name)) continue;
  const t = fs.readFileSync(path.join(root, ent.name, "info.txt"), "utf8");
  const g = (k) => ((t.match(new RegExp(`^${k}:\\s*(.*)$`, "m")) || [])[1] || "").trim();
  const name = g("Názov");
  const cat = g("Kategória");
  const sub = g("Subkategória");
  const druh = g("Druh");
  if (/stuha|páska|Stuhy/i.test([name, sub, druh].join(" "))) {
    console.log(`${ent.name}\t${cat}\t${sub}\t${druh}\t${name}`);
  }
}
