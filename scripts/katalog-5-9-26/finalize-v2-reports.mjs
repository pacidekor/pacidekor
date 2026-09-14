import fs from "node:fs";
import path from "node:path";

const root = "katalog_raw/noveprodukty5.9.26-ready-v2";
for (const id of ["147", "155", "172", "66"]) {
  const t = fs.readFileSync(path.join(root, id, "info.txt"), "utf8");
  const line = t.split(/\r?\n/).find((l) => l.startsWith("Farby:"));
  console.log(id, JSON.stringify(line));
}

// Update mapovani + k-overeni + souhrn after 147 fix
const reports = "scripts/katalog-5-9-26/v2-reports";
const mapPath = path.join(reports, "mapovani-fotek.json");
const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
map.push({
  action: "pending-color-photo",
  productId: "147",
  photos: [1],
  note: "Odstránená neoverená farba „číry\". Snímok 1.webp ostáva pri produkte; farba sa doplní po potvrdení (sneh vs číry sprej).",
});
fs.writeFileSync(mapPath, JSON.stringify(map, null, 2));

// Copy reports into working copy for handoff
const dest = path.join(root, "_reports");
fs.mkdirSync(dest, { recursive: true });
for (const f of fs.readdirSync(reports)) {
  fs.copyFileSync(path.join(reports, f), path.join(dest, f));
}

// Enrich souhrn
const souhrn = `# Souhrn úprav katalogu ready-v2

## Výsledek
- Aktivní produkty: **167** (z 180)
- Sloučeno / archivováno: **13** (složky v \`_archived/\`)
- Rozdělení modelů: **0** (žádné doložené rozdělení uvnitř barevné skupiny)
- Přejmenováno: **65**
- Otázky k ověření: viz \`k-overeni.md\`
- Em dash / en dash v textech: **0**
- Popisy s barvou nebo počtem kusů: **0**
- Validace Farby → WebP: **OK**

## Co zákazník uvidí
Samostatné karty pro vizuálně odlišné modely. Barevné varianty stejného modelu jsou pod jedním produktem s vlastními fotkami a přepínáním barev. Žádný výběr „Provedení / Varianta" modelů.

## Doložená sloučení
| Z | Do | Důvod |
|---|----|-------|
| 68 | 66 | Prezentační mix barev stejné guľovité dálie |
| 162 | 156 | Stejný květinový vzor stuhy, jen barva podkladu |
| 180 | 127 | Stejné prodloužené dřevěné spirálky |
| 116 | 83 | Stejná dvojbarevná dřevěná růžička |
| 87, 97 | 85 | Stejná spirálovitá dřevěná hlava |
| 16 | 15 | Stejná hlava iskerníka, jen barva |
| 14 | 13 | Stejná ruže so zvlnenými okrajmi |
| 32 | 28 | Stejná ruže s prehnutými lupienkami |
| 35 | 34 | Stejná ruže so zvrásnenými lupienkami |
| 38 | 36 | Stejná ruže so zahnutými okrajmi |
| 46 | 43 | Stejná guľovitá ruže (46 = balené foto) |
| 70 | 67 | Stejná pivónie s guľovitým stredom |

## Taxonomie (počet aktivních)
- Stuhy: 21
- Floristické potreby: 13
- Prírodniny: 32
- Ostatní (Umelé kvety aj.): 101

## Společná galerie (mimo pole Farby)
Viz \`spolecna-galerie.json\` - potřebné rozšíření importu:
- **66**: fotky 10-11 (mix z původního 68)
- **155**: fotky 1-3 (mix zelená/marhuľová - čeká na samostatné barvy nebo potvrzení sady)
- **172**: fotky 1-2 (mix 8 barev lyka - čeká na samostatné role nebo potvrzení sady)
- **147**: foto 1 bez barvy „číry" (čeká na potvrzení typu spreje)

## JPG vs WebP (102)
Zdrojový STAV uvádí 642 JPG, ready má 540 WebP. Rozdíl 102 vznikl při prvním exportu (vynechané mix/duplicitní záběry). Originály JPG jsou v \`katalog_raw/noveprodukty5.9.26/-III\`. Náhradní obrázky nevznikly; kontrola je doložitelná ze zdrojové várky.

## Předání
- Originál: \`katalog_raw/noveprodukty5.9.26-ready/\` **beze změny**
- Pracovní kopie: \`katalog_raw/noveprodukty5.9.26-ready-v2/\`
- Reporty: \`scripts/katalog-5-9-26/v2-reports/\` a kopie v \`ready-v2/_reports/\`
- Nic nebylo publikováno do e-shopu ani živé DB.
`;
fs.writeFileSync(path.join(reports, "souhrn-uprav.md"), souhrn);
fs.writeFileSync(path.join(dest, "souhrn-uprav.md"), souhrn);

console.log("updated reports + copied to _reports");
