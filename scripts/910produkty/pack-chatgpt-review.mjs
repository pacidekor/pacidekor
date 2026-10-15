/**
 * Pack held-for-review products into a ChatGPT-friendly ZIP.
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { execSync } from "child_process";

const ROOT = path.resolve(".");
const READY = path.join(ROOT, "public/910produkty-ready");
const OUT = path.join(ROOT, "scripts/910produkty/chatgpt-review");
const PRODUCTS = path.join(OUT, "products");
const HELD = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, "scripts/910produkty/validation-reports/held-for-import.json"),
    "utf8",
  ),
);
const KO = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, "scripts/910produkty/validation-reports/k-overeni.json"),
    "utf8",
  ),
);
const CAT = JSON.parse(
  fs.readFileSync(path.join(ROOT, "scripts/910produkty/catalog.json"), "utf8"),
);
const byId = Object.fromEntries(
  CAT.map((p) => [String(p.id).padStart(3, "0"), p]),
);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(PRODUCTS, { recursive: true });

const reasonsById = {};
for (const r of KO) {
  if (r.severity === "info") continue;
  const id = String(r.id).padStart(3, "0");
  if (!HELD.includes(id)) continue;
  if (!reasonsById[id]) reasonsById[id] = [];
  reasonsById[id].push({
    severity: r.severity,
    reason: r.reason,
    photo: r.photo ?? null,
    colors: r.colors ?? null,
  });
}

const manifest = [];

for (const id of HELD) {
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

  // contact strip of all photos
  const CELL = 200;
  const PAD = 6;
  const cols = Math.min(webps.length, 6);
  const rows = Math.ceil(webps.length / cols);
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
      width: W,
      height: H,
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

  manifest.push({
    id,
    name: p?.name || "",
    category: p?.category || "",
    subcategory: p?.subcategory || "",
    druh: p?.druh || "",
    imageCount: webps.length,
    currentFarby: farby,
    flags: reasonsById[id] || [],
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

const prompt = `# Úloha: audit farebného mapovania produktov PACIDEKOR

Si senior vizuálny QA + catalog manager pre slovenský veľkoobchodný e-shop s umelými kvetmi, keramikou a aranžérskym materiálom (PACIDEKOR).

## Kontext
- Tieto produkty ešte **neboli importované** na e-shop, lebo automatická kontrola našla riziká v mapovaní farieb na fotky.
- V balíku je **${manifest.length} produktov**.
- Každý produkt má zložku \`products/{ID}/\` s:
  - \`info.txt\` (aktuálny návrh metadát)
  - \`1.jpg … N.jpg\` (všetky fotky, čísla = poradie v galérii)
  - \`_sheet.jpg\` (prehľad všetkých fotiek s číslami)
- \`manifest.json\` obsahuje zoznam produktov + aktuálny riadok Farby + flagy z automatickej kontroly.

## Čo máš skontrolovať (u KAŽDÉHO produktu)
1. **Je to 1 produkt alebo treba rozdeliť?** (rôzne SKU / rôzne tvary omylom v jednej zložke)
2. **Farebné varianty:** koľko reálnych predajných farieb je na fotkách?
3. **Mapovanie Farby → fotky:** sedí aktuálny riadok \`Farby:\` v \`info.txt\`?
   - Formát: \`biela [1-3] | zelená [4-6]\` alebo \`krémová [1,3,5]\`
   - Čísla sú **1-based** indexy fotiek (\`1.jpg\` = 1)
   - Každá fotka 1…N by mala patriť aspoň jednej farbe
   - Skupinová / overview fotka (viac farieb naraz) môže byť v **viacerých** farbách naraz ALEBO len pri jednej — uveď čo odporúčaš
4. **„Zelená“ u kvetov:** je to skutočná farba kvetu (šalviová/dusty green), alebo len lístie pri inej farbe?
5. **Názov / popis / kategória:** len ak je zjavne zle — navrhni opravu (slovensky)
6. **Import ready?** \`yes\` / \`yes_after_fix\` / \`no_split_needed\` / \`needs_human\`

## Pravidlá
- Všetky texty návrhov **po slovensky**
- Bez em-dash (použi \`-\`)
- Farby krátke, malými písmenami (biela, krémová, ružová, staroružová, fialová, zelená, šalviová, oranžová, žltá, bordová, hnedá, béžová, sivá, čierna, zlatá, strieborná, prírodná, mix, …)
- Popis **nesmie** obsahovať farbu ani počet kusov (farby patria len do Farby)
- Buď prísny, ale praktický: ak je mapovanie OK, napíš to stručne a nehľadaj problémy nasilu
- Ak si nie si istý na >20 %, daj \`needs_human\` a vysvetli prečo

## Povinný výstup
Vráť **jeden JSON objekt** (môžeš dať aj markdown tabuľku NAVYŠE, ale JSON je povinný):

\`\`\`json
{
  "summary": {
    "reviewed": ${manifest.length},
    "ok_as_is": 0,
    "fix_farby": 0,
    "fix_meta": 0,
    "split_or_reject": 0,
    "needs_human": 0
  },
  "products": [
    {
      "id": "007",
      "verdict": "yes_after_fix",
      "confidence": 0.86,
      "currentFarby": "…ako je teraz…",
      "proposedFarby": "oranžová [1-2] | krémová [3-5] | ružová [6-9]",
      "farbyChanged": true,
      "proposedName": null,
      "proposedDescription": null,
      "proposedCategory": null,
      "proposedSubcategory": null,
      "notes": "Foto 1 je skupinová - priraď ju ku všetkým farbám alebo len k prvej. …",
      "photoNotes": [
        { "photo": 1, "is": "group overview", "assignTo": ["oranžová", "krémová", "ružová"] },
        { "photo": 2, "is": "oranžová detail", "assignTo": ["oranžová"] }
      ],
      "issues": ["overlap_group_shot", "possible_wrong_range"]
    }
  ]
}
\`\`\`

### Polia verdict
- \`yes\` = importovať bez zmeny Farieb/meta
- \`yes_after_fix\` = importovať po aplikovaní proposed*
- \`no_split_needed\` = rozdeliť na viac produktov / vyradiť (vysvetli v notes)
- \`needs_human\` = nevieš spoľahlivo rozhodnúť

## Odporúčaný postup práce
1. Prečítaj \`manifest.json\`
2. Pre každý \`id\` otvor \`_sheet.jpg\`, potom podľa potreby jednotlivé \`N.jpg\`
3. Porovnaj s \`Farby:\` v \`info.txt\`
4. Zapíš záznam do \`products[]\`
5. Na konci vyplň \`summary\` počty
6. **Za JSON** ešte vypíš ľudskú prioritu:
   - TOP problémy (musí sa opraviť)
   - OK na import
   - Needs human

Začni kontrolou multi-color produktov (viac fotiek / viac farieb), potom keramiku so skupinovou fotkou, potom zvyšok.
`;

fs.writeFileSync(path.join(OUT, "PROMPT.md"), prompt, "utf8");

const readme = `# ChatGPT review pack — PACIDEKOR 910 (held products)

Počet produktov: **${manifest.length}**

## Ako použiť
1. Nahraj tento ZIP do ChatGPT (Astra / model s vision).
2. Ako prvú správu vlož obsah \`PROMPT.md\` (alebo napíš: „Postupuj podľa PROMPT.md v ZIP-e“).
3. Nech prejde všetky \`products/{ID}/\` (sheet + fotky + info.txt).
4. Výstup: detailný JSON + priority podľa promptu.

## Štruktúra
- \`PROMPT.md\` — inštrukcie
- \`manifest.json\` — zoznam + flagy
- \`products/XXX/\` — info.txt, 1.jpg…N.jpg, _sheet.jpg
`;

fs.writeFileSync(path.join(OUT, "README.md"), readme, "utf8");

const zipPath = path.join(
  ROOT,
  "public/910produkty-ready/_reports/910-held-chatgpt-review.zip",
);
fs.mkdirSync(path.dirname(zipPath), { recursive: true });
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

// Prefer tar/Compress-Archive via PowerShell
const ps = `Compress-Archive -Path '${OUT.replace(/'/g, "''")}\\*' -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force`;
execSync(`powershell -NoProfile -Command "${ps}"`, { stdio: "inherit" });

const sizeMb = (fs.statSync(zipPath).size / (1024 * 1024)).toFixed(1);
console.log("ZIP", zipPath, sizeMb + " MB");
console.log("products", manifest.length);
