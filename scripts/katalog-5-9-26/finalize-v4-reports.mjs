import fs from "node:fs";
import path from "node:path";

const reports = "scripts/katalog-5-9-26/v4-reports";
const changes = JSON.parse(
  fs.readFileSync(path.join(reports, "prehled-popisu.json"), "utf8"),
);

const lines = [
  "# Přehled změněných popisů (v4)",
  "",
  `Počet změn: **${changes.length}**`,
  "",
  "Strojový výpis: `prehled-popisu.json`",
  "",
];
for (const x of changes) {
  lines.push(`### ${x.id} — ${x.newName}`);
  lines.push("");
  lines.push(`- Původní: ${x.originalDescription}`);
  lines.push(`- Nový: ${x.newDescription}`);
  if (x.originalName !== x.newName) {
    lines.push(`- Název: ${x.originalName} → ${x.newName}`);
  }
  lines.push("");
}
fs.writeFileSync(path.join(reports, "prehled-popisu.md"), lines.join("\n"), "utf8");

const dest = path.join("katalog_raw/noveprodukty5.9.26-ready-v4/_reports");
fs.mkdirSync(dest, { recursive: true });
for (const f of fs.readdirSync(reports)) {
  fs.copyFileSync(path.join(reports, f), path.join(dest, f));
}
console.log("reports synced", changes.length);
