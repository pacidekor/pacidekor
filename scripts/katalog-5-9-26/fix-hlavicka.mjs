import fs from "node:fs";

const f = "scripts/katalog-5-9-26/rename-proposals-dekor.json";
let t = fs.readFileSync(f, "utf8");
t = t
  .replace(/Hlavičky/g, "Hlavy")
  .replace(/hlavičky/g, "hlavy")
  .replace(/"Hlavička kvetu"/g, '"Hlava kvetu"')
  .replace(/Hlavička /g, "Hlava ")
  .replace(/hlavička /g, "hlava ")
  .replace(/Drevená hlavička/g, "Drevená hlava")
  .replace(/drevená hlavička/g, "drevená hlava");
fs.writeFileSync(f, t);
console.log("remaining Hlavič", (t.match(/Hlavič/gi) || []).length);
