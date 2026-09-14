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

const byDruh = new Map();
for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
  if (!ent.isDirectory() || /hotovo/i.test(ent.name) || !/^\d+$/.test(ent.name))
    continue;
  const info = parse(fs.readFileSync(path.join(root, ent.name, "info.txt"), "utf8"));
  if (info["Kategória"] !== "Aranž. materiál") continue;
  const druh = info["Druh"] || "(bez druhu)";
  if (!byDruh.has(druh)) byDruh.set(druh, []);
  byDruh.get(druh).push(`${ent.name} ${info["Názov"]}`);
}

console.log("Produkty v Aranž. materiál (v4) podle Druh:\n");
for (const [druh, items] of [...byDruh.entries()].sort()) {
  console.log(`${druh} (${items.length})`);
  for (const x of items) console.log(`  - ${x}`);
  console.log("");
}
