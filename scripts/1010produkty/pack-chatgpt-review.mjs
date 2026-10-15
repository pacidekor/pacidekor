/**
 * Pack ALL 1010 ready products into a ChatGPT vision review ZIP.
 *
 * Usage: node scripts/1010produkty/pack-chatgpt-review.mjs
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { execSync } from "child_process";

const ROOT = path.resolve(".");
const READY = path.join(ROOT, "public/1010produkty-ready");
const OUT = path.join(ROOT, "scripts/1010produkty/chatgpt-review");
const PRODUCTS = path.join(OUT, "products");
const CAT = JSON.parse(
  fs.readFileSync(path.join(ROOT, "scripts/1010produkty/catalog.json"), "utf8"),
);
const byId = Object.fromEntries(
  CAT.map((p) => [String(p.id).padStart(3, "0"), p]),
);

const ids = fs
  .readdirSync(READY, { withFileTypes: true })
  .filter((e) => e.isDirectory() && /^\d+$/.test(e.name))
  .map((e) => e.name)
  .sort((a, b) => Number(a) - Number(b));

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(PRODUCTS, { recursive: true });

const manifest = [];

for (const id of ids) {
  const srcDir = path.join(READY, id);
  const destDir = path.join(PRODUCTS, id);
  fs.mkdirSync(destDir, { recursive: true });

  const infoRaw = fs.readFileSync(path.join(srcDir, "info.txt"), "utf8");
  fs.writeFileSync(path.join(destDir, "info.txt"), infoRaw, "utf8");

  const webps = fs
    .readdirSync(srcDir)
    .filter((f) => /^\d+\.webp$/i.test(f))
    .sort((a, b) => Number(a) - Number(b));

  for (const w of webps) {
    const n = w.replace(/\D/g, "");
    await sharp(path.join(srcDir, w))
      .rotate()
      .resize({
        width: 900,
        height: 900,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 78, mozjpeg: true })
      .toFile(path.join(destDir, `${n}.jpg`));
  }

  const CELL = 200;
  const PAD = 6;
  const cols = Math.min(webps.length, 6);
  const rows = Math.ceil(webps.length / cols) || 1;
  const W = cols * CELL + (cols + 1) * PAD;
  const headerH = 44;
  const H = headerH + rows * CELL + (rows + 1) * PAD;
  const p = byId[id];
  const title = `${id} | ${(p?.name || "").slice(0, 60)} | ${webps.length} fotiek`;
  const comps = [];
  const svg = Buffer.from(
    `<svg width="${W}" height="${headerH}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#2f2924"/><text x="10" y="28" font-family="Arial" font-size="15" fill="#fff">${title.replace(/[<>&]/g, "")}</text></svg>`,
  );
  comps.push({ input: await sharp(svg).png().toBuffer(), top: 0, left: 0 });
  for (let i = 0; i < webps.length; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const left = PAD + c * (CELL + PAD);
    const top = headerH + PAD + r * (CELL + PAD);
    const thumb = await sharp(path.join(destDir, `${i + 1}.jpg`))
      .resize(CELL, CELL, {
        fit: "contain",
        background: { r: 245, g: 242, b: 236 },
      })
      .jpeg({ quality: 70 })
      .toBuffer();
    comps.push({ input: thumb, top, left });
    const badge = Buffer.from(
      `<svg width="28" height="22" xmlns="http://www.w3.org/2000/svg"><rect width="28" height="22" rx="4" fill="#75825B"/><text x="14" y="16" text-anchor="middle" font-size="12" fill="#fff" font-family="Arial">${i + 1}</text></svg>`,
    );
    comps.push({
      input: await sharp(badge).png().toBuffer(),
      top: top + 4,
      left: left + 4,
    });
  }
  await sharp({
    create: {
      width: Math.max(W, 200),
      height: Math.max(H, headerH + 40),
      channels: 3,
      background: { r: 232, g: 235, b: 226 },
    },
  })
    .composite(comps)
    .jpeg({ quality: 80 })
    .toFile(path.join(destDir, "_sheet.jpg"));

  const farby =
    infoRaw
      .split(/\r?\n/)
      .find((l) => l.startsWith("Farby:"))
      ?.replace(/^Farby:\s*/, "") || "";

  const flags = [];
  if ((p?.notes || "").toLowerCase().includes("zlúč")) {
    flags.push({ severity: "review", reason: p.notes });
  }
  if ((p?.groups || []).length >= 3) {
    flags.push({
      severity: "review",
      reason: `multi-color: ${(p.groups || []).map((g) => g.color).join(", ")}`,
    });
  }
  if ((p?.confidence ?? 1) < 0.9) {
    flags.push({
      severity: "warn",
      reason: `nízka confidence ${p.confidence}`,
    });
  }

  manifest.push({
    id,
    name: p?.name || "",
    category: p?.category || "",
    subcategory: p?.subcategory || "",
    druh: p?.druh || "",
    imageCount: webps.length,
    currentFarby: farby,
    confidence: p?.confidence ?? null,
    draftNotes: p?.notes || "",
    flags,
    path: `products/${id}/`,
    sheet: `products/${id}/_sheet.jpg`,
    photos: webps.map((_, i) => `products/${id}/${i + 1}.jpg`),
  });

  console.log("packed", id, webps.length);
}

fs.writeFileSync(
  path.join(OUT, "manifest.json"),
  JSON.stringify(manifest, null, 2),
  "utf8",
);

const prompt = `# Úloha: kompletný vizuálny audit dávky PACIDEKOR 1010 (PREFOTENÉ)

Si senior vizuálny QA + catalog manager pre slovenský veľkoobchodný e-shop s umelými kvetmi a dekoráciami (PACIDEKOR).

## Kontext
- Dávka: **NAHRATÉ 10.10.2026 / PREFOTENÉ**
- Produktov: **${manifest.length}** (ešte **neboli importované**)
- Draft katalóg už existuje (názvy, Farby, kategórie) — tvoja úloha je ho **overiť a opraviť**
- Každý produkt: \`products/{ID}/\`
  - \`info.txt\` — aktuálny návrh metadát
  - \`1.jpg … N.jpg\` — galéria (čísla = 1-based indexy)
  - \`_sheet.jpg\` — prehľad všetkých fotiek s číslami
- \`manifest.json\` — zoznam + aktuálne Farby + draft poznámky

## Čo skontrolovať u KAŽDÉHO produktu
1. **1 produkt alebo split?** Rôzne modely/tvary omylom v jednej zložke → \`no_split_needed\` + návrh rozdelenia
2. **Zlúčenie:** či 2 zložky sú ten istý predajný model (najmä 002+003) → navrhni merge
3. **Farebné varianty:** koľko reálnych predajných farieb je na fotkách?
4. **Mapovanie Farby → fotky:** sedí riadok \`Farby:\`?
   - Formát: \`biela [1-3] | zelená [4-6]\` alebo \`krémová [1,3,5]\`
   - Čísla = 1-based (\`1.jpg\` = 1)
   - Každá fotka 1…N by mala patriť aspoň jednej farbe
   - Skupinová / overview fotka (viac farieb naraz) môže byť vo **viacerých** farbách
5. **„Zelená“ u kvetov:** skutočná farba kvetu, alebo len lístie?
6. **Názov / popis / kategória / subkategória / druh:** oprav len ak je zjavne zle (slovensky)
7. **Import ready?** \`yes\` / \`yes_after_fix\` / \`no_split_needed\` / \`needs_human\` / \`merge_with\`

## Defaults (ak nie je fotografický dôkaz inak)
- \`single_sku\` — jeden produkt bez rozmerových variantov
- Nepridávaj neoverené rozmery ani počet kusov
- Popis **nesmie** obsahovať farbu ani počet kusov (farby len do Farby)
- \`mix\` = kombinovaný vzhľad jedného vyhotovenia ALEBO mix balenie bez výberu farby — uveď ktoré
- \`prírodná\` = prírodný/neutrálny jednofarebný vzhľad bez farebného výberu

## Pravidlá textu
- Všetky návrhy **po slovensky**
- Bez em-dash (použi \`-\`)
- Farby krátke, malými: biela, krémová, ružová, staroružová, lososová, fialová, zelená, zelenožltá, šalviová, oranžová, žltá, modrá, béžová, hnedá, sivá, čierna, zlatá, strieborná, prírodná, mix, …
- Buď prísny, ale praktický — ak je OK, napíš to stručne
- Ak si nie si istý na >20 %, daj \`needs_human\`

## Špeciálne body na overenie v tejto dávke
- **002 + 003**: draft hovorí, že môžu byť rovnaký model — zlúčiť alebo nie?
- **010 vs 011**: dve hortenzie — sú to naozaj dva produkty?
- **001 vs 012**: dve kytice pivoniek — sú rôzne?
- **017 vs 022**: dve biele ruže — sú rôzne modely?
- Multi-color s mix/overview fotkou: 001, 004, 006, 009, 011, 025–027, 030, 032

## Povinný výstup
Jeden JSON objekt (+ môžeš pridať markdown prioritu NAVYŠE):

\`\`\`json
{
  "summary": {
    "reviewed": ${manifest.length},
    "ok_as_is": 0,
    "fix_farby": 0,
    "fix_meta": 0,
    "split_or_reject": 0,
    "merge_candidates": 0,
    "needs_human": 0
  },
  "products": [
    {
      "id": "006",
      "verdict": "yes_after_fix",
      "confidence": 0.9,
      "currentFarby": "…ako je teraz…",
      "proposedFarby": "biela [1,5,9,11] | modrá [2,5,8,10] | fialová [3,5,6,13] | žltá [4,5,7,12]",
      "farbyChanged": false,
      "proposedName": null,
      "proposedDescription": null,
      "proposedCategory": null,
      "proposedSubcategory": null,
      "proposedDruh": null,
      "mergeWith": null,
      "splitPlan": [],
      "notes": "…",
      "photoNotes": [
        { "photo": 5, "is": "group overview", "assignTo": ["biela", "modrá", "fialová", "žltá"] }
      ],
      "issues": []
    }
  ]
}
\`\`\`

### Polia verdict
- \`yes\` — importovať bez zmeny
- \`yes_after_fix\` — importovať po aplikovaní proposed*
- \`no_split_needed\` — najprv rozdeliť (vyplň \`splitPlan\`)
- \`merge_with\` — zlúčiť s iným ID (vyplň \`mergeWith\`, napr. \`"003"\`)
- \`needs_human\` — nevieš spoľahlivo rozhodnúť

### splitPlan (len pri no_split_needed)
\`\`\`json
"splitPlan": [
  {
    "newId": "006a",
    "name": "…",
    "photos": [1, 2],
    "farby": "biela [1-2]",
    "importFarby": "biela [1-2]",
    "category": "Umelé kvety",
    "subcategory": "Stopkové kvety",
    "description": "…"
  }
]
\`\`\`
- \`photos\` = pôvodné čísla v tejto galérii
- \`importFarby\` = prepočítané na novú galériu (1…N v poradí \`photos\`)

## Postup
1. Prečítaj \`manifest.json\`
2. Pre každý ID: \`_sheet.jpg\` → podľa potreby jednotlivé \`N.jpg\` → \`info.txt\`
3. Zapíš záznam do \`products[]\` (všetkých ${manifest.length})
4. Vyplň \`summary\`
5. **Za JSON** vypíš ľudskú prioritu:
   - TOP problémy (musí sa opraviť)
   - Merge / split návrhy
   - OK na import
   - Needs human

Začni multi-color produktmi a spornými pármi (002/003, 010/011, 001/012, 017/022), potom zvyšok.
`;

fs.writeFileSync(path.join(OUT, "PROMPT.md"), prompt, "utf8");
fs.writeFileSync(
  path.join(ROOT, "scripts/1010produkty/PROMPT-CHATGPT.md"),
  prompt,
  "utf8",
);

const readme = `# ChatGPT review pack — PACIDEKOR 1010 (PREFOTENÉ)

Počet produktov: **${manifest.length}**

## Ako použiť
1. Nahraj tento ZIP do ChatGPT (model s vision).
2. Ako prvú správu vlož celý obsah \`PROMPT.md\`.
3. Nech prejde všetky \`products/{ID}/\` (sheet + fotky + info.txt).
4. Výstup: jeden JSON + priorita podľa promptu.
5. JSON ulož (napr. do Downloads) a pošli späť do Cursoru na aplikovanie opráv + import.

## Štruktúra
- \`PROMPT.md\` — inštrukcie
- \`manifest.json\` — zoznam + aktuálne Farby
- \`products/XXX/\` — info.txt, 1.jpg…N.jpg, _sheet.jpg
`;

fs.writeFileSync(path.join(OUT, "README.md"), readme, "utf8");

const reportsDir = path.join(READY, "_reports");
fs.mkdirSync(reportsDir, { recursive: true });
const zipPath = path.join(reportsDir, "1010-chatgpt-review.zip");
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

const absOut = OUT.replace(/'/g, "''");
const absZip = zipPath.replace(/'/g, "''");
execSync(
  `powershell -NoProfile -Command "Compress-Archive -Path '${absOut}\\*' -DestinationPath '${absZip}' -Force"`,
  { stdio: "inherit" },
);

// Also copy to Downloads for convenience
const dl = path.join(
  process.env.USERPROFILE || "",
  "Downloads",
  "PACIDEKOR-1010-chatgpt-review.zip",
);
try {
  fs.copyFileSync(zipPath, dl);
  console.log("Downloads copy:", dl);
} catch (e) {
  console.warn("Downloads copy failed:", e.message);
}

const sizeMb = (fs.statSync(zipPath).size / (1024 * 1024)).toFixed(1);
console.log("ZIP", zipPath, sizeMb + " MB");
console.log("products", manifest.length);
