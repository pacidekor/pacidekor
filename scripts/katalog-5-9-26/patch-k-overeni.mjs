import fs from "node:fs";

const p = "scripts/katalog-5-9-26/v2-reports/k-overeni.md";
let t = fs.readFileSync(p, "utf8");

// Clarify already-merged confirmations
const note = `

## Již provedená sloučení - jen potvrdit nebo vrátit
Tyto položky jsou ve v2 už sloučené. Otázka slouží jen ke kontrole dodavatelem/SKU:
- **35 → 34**, **46 → 43**, **70 → 67**: sloučeno podle vizuální shody modelu; potvrďte SKU/balení, jinak lze vrátit z \`_archived/\`.
`;

if (!t.includes("Již provedená sloučení")) {
  t = t.trimEnd() + "\n" + note;
}
fs.writeFileSync(p, t);
fs.copyFileSync(p, "katalog_raw/noveprodukty5.9.26-ready-v2/_reports/k-overeni.md");
console.log("k-overeni updated");
