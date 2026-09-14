import fs from "node:fs";
import path from "node:path";

const root = "katalog_raw/noveprodukty5.9.26-ready-v4";
const rows = [];

for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
  if (!ent.isDirectory() || !/^\d+$/.test(ent.name)) continue;
  const text = fs.readFileSync(path.join(root, ent.name, "info.txt"), "utf8");
  const get = (k) => {
    const m = text.match(new RegExp(`^${k}:\\s*(.*)$`, "m"));
    return m ? m[1].trim() : "";
  };
  rows.push({
    id: ent.name,
    name: get("Názov"),
    desc: get("Popis"),
    druh: get("Druh"),
    cat: get("Kategória"),
    sub: get("Subkategória"),
  });
}

rows.sort((a, b) => Number(a.id) - Number(b.id));

const mechanical = rows.filter(
  (r) =>
    /\(/.test(r.desc) ||
    /^Dekoratívny (produkt|prírodný prvok)/i.test(r.desc) ||
    /^Dekoratívny .+ vhodný/i.test(r.desc) ||
    /Dekoratívny (echinacea|artičoka|umelá)/i.test(r.desc) ||
    /Dekoratívny dekoračný/i.test(r.desc),
);

console.log("total", rows.length);
console.log("suspect", mechanical.length);
for (const r of mechanical.slice(0, 80)) {
  console.log(`${r.id}|${r.name}|${r.desc}`);
}

fs.writeFileSync(
  "scripts/katalog-5-9-26/v4-desc-inventory.json",
  JSON.stringify(rows, null, 2),
);
