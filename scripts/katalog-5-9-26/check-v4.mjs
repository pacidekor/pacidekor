import fs from "node:fs";
import path from "node:path";

const root = "katalog_raw/noveprodukty5.9.26-ready-v4";
const MECH =
  /Dekoratívny produkt\s*\(|Dekoratívny prírodný prvok\s*\(|Dekoratívny dekoračný|Dekoratívny echinacea|Dekoratívny artičoka|Dekoratívny umelá|Jednoduchý doplnok bez nutnosti/;

const bad = [];
const samples = {};
for (const id of ["1", "2", "8", "9", "10", "81", "90", "108", "110", "120", "127", "144", "148", "160", "163", "41", "55", "73"]) {
  samples[id] = fs.readFileSync(path.join(root, id, "info.txt"), "utf8");
}
for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
  if (!ent.isDirectory() || !/^\d+$/.test(ent.name)) continue;
  const t = fs.readFileSync(path.join(root, ent.name, "info.txt"), "utf8");
  const desc = (t.match(/^Popis:\s*(.*)$/m) || [])[1] || "";
  if (MECH.test(desc) || /\(.*\)/.test(desc)) bad.push(`${ent.name}: ${desc}`);
}
console.log("remaining mechanical/paren", bad.length);
console.log(bad.slice(0, 20).join("\n"));
for (const [id, t] of Object.entries(samples)) {
  console.log("====", id);
  console.log(t.trim());
  console.log("");
}
