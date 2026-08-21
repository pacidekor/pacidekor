/**
 * Batch 1 processor: convert JPG->WebP 85%, write meta.txt, append STAV.
 * Run: node _katalog-work/process-batch1.js
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const SRC_ROOT = path.join(
  __dirname,
  "..",
  "katalog_raw",
  "produktyznovu",
);
const CLEAN_ROOT = path.join(__dirname, "clean");
const STAV_PATH = path.join(__dirname, "STAV.tsv");
const QUALITY = 85;

/** Shared hex palette (keep stable across batches). */
const HEX = {
  biela: "#F5F5F0",
  kremova: "#E8D9C4",
  ruzova: "#E8A0B0",
  fialova: "#7A5F8A",
  cervena: "#B43C3C",
  bordova: "#800020",
  zlta: "#E0C35A",
  oranzova: "#D4894A",
  zelena: "#6B7F5A",
  hneda: "#8A6A4A",
  seda: "#9A9A96",
};

const BATCH = [
  {
    src: "1",
    num: "001",
    name: "Vres - drobnokvetý stonek",
    description:
      "Umelý drobnokvetý stonek so splývajúcimi strapcami drobných kvetov. Vhodný ako výplň do aranžmánov a vencov.",
    category: "Umelé kvety",
    subcategory: "vencovky",
    druh: "vres",
    colors: [{ label: "Fialová", hex: HEX.fialova, photos: "1-3" }],
    match: "vres-s-drobnymi-kvietkami",
    status: "NA_ESHOPU",
    note: "Podobné Vres s drobnými kvietkami - overiť, či ide o rovnaký produkt alebo inú farbu/variant.",
  },
  {
    src: "10",
    num: "002",
    name: "Kytica ruží s drobnými kvetmi",
    description:
      "Umelá kytica drobných ruží s bobuľkami a zeleňou. Kompaktný zväzok vhodný do vázy.",
    category: "Umelé kvety",
    subcategory: "kytice",
    druh: "ruze",
    colors: [{ label: "Ružová", hex: HEX.ruzova, photos: "1-3" }],
    match: "kytica-ruzi-s-drobnymi-kvetmi",
    status: "NA_ESHOPU",
    note: "Vizualne blízke kytica-ruzi-s-drobnymi-kvetmi / kytica-ruzi-svetloruzova.",
  },
  {
    src: "11",
    num: "003",
    name: "Orchidea mini spray",
    description:
      "Umelá orchidea typu mini spray na dlhej stopke. Viac farebných variantov (různé odtiene okvetných lístkov).",
    category: "Umelé kvety",
    subcategory: "stopkove-kvety",
    druh: "orchidea",
    colors: [
      { label: "Ružová", hex: HEX.ruzova, photos: "1-3" },
      { label: "Biela", hex: HEX.biela, photos: "4-6" },
      { label: "Fialová", hex: HEX.fialova, photos: "7-9" },
      { label: "Krémová", hex: HEX.kremova, photos: "10-12" },
      { label: "Zelená", hex: HEX.zelena, photos: "13-15" },
      { label: "NEJISTE dalsie", hex: "", photos: "16-20" },
    ],
    match: "orchidea-mini-spray",
    status: "OPRAVA",
    note: "20 fotiek - pravdepodobne orchidea-mini-spray. Treba zoradiť farby po trojiciach a overiť mapovanie.",
  },
  {
    src: "13",
    num: "004",
    name: "Drobné hviezdicové kvety",
    description:
      "Umelé drobné hviezdicové kvety na stopkách so zubatými listami. Vhodné ako filler.",
    category: "Umelé kvety",
    subcategory: "doplnky",
    druh: "drobnokvet",
    colors: [{ label: "Biela", hex: HEX.biela, photos: "1-3" }],
    match: "drobne-hviezdicove-kvety",
    status: "NA_ESHOPU",
    note: "Možný match na drobne-hviezdicove-kvety / drobny-filler-hviezdicove-kvietky.",
  },
  {
    src: "18",
    num: "005",
    name: "Listová vetva (lesklá)",
    description:
      "Umelá listová vetva s lesklými oválnymi listami na drevenom stonku.",
    category: "Umelé kvety",
    subcategory: "listy",
    druh: "vetva",
    colors: [{ label: "Zelená", hex: HEX.zelena, photos: "1-3" }],
    match: "listova-vetva-leskla",
    status: "NA_ESHOPU",
    note: "Match listova-vetva-leskla / listovy-konar-leskly.",
  },
  {
    src: "19",
    num: "006",
    name: "Drobnolistá zeleň",
    description:
      "Umelá drobnolistá zeleň na stopkách - husté oválne lístky so zubatým okrajom.",
    category: "Umelé kvety",
    subcategory: "listy",
    druh: "zelen",
    colors: [{ label: "Zelená", hex: HEX.zelena, photos: "1-3" }],
    match: "drobnolista-zelen",
    status: "NA_ESHOPU",
    note: "Match drobnolista-zelen.",
  },
  {
    src: "20",
    num: "007",
    name: "Ginkgo žlté",
    description:
      "Umelá vetva ginkgo s vejárovými žltými listami na tmavom stonku.",
    category: "Umelé kvety",
    subcategory: "listy",
    druh: "ginkgo",
    colors: [{ label: "Žltá", hex: HEX.zlta, photos: "1-3" }],
    match: "ginkgo-zlte",
    status: "NA_ESHOPU",
    note: "Jasný match ginkgo-zlte.",
  },
  {
    src: "21",
    num: "008",
    name: "Brečtan pestrobarevný",
    description:
      "Umelý panašovaný brečtan - zelené listy s krémovo-bielym okrajom.",
    category: "Umelé kvety",
    subcategory: "listy",
    druh: "zelen",
    colors: [
      {
        label: "Zeleno-biela",
        hex: "#6B7F5A-E8D9C4",
        photos: "1-3",
      },
    ],
    match: "brectan-pestrobarevny",
    status: "NA_ESHOPU",
    note: "Match brectan-pestrobarevny (na e-shope ma color_ids len zelena - mozna doplnit panase).",
  },
  {
    src: "22",
    num: "009",
    name: "List mečovitý (aspidistra) - matný / ojedený",
    description:
      "Umelé úzke mečovité listy s matným, prašným povrchom (sage/dusty look).",
    category: "Umelé kvety",
    subcategory: "listy",
    druh: "zelen",
    colors: [{ label: "Zelená", hex: HEX.zelena, photos: "1-3" }],
    match: "list-mecovity-aspidistra",
    status: "NEJISTE",
    note: "Možno list-mecovity-aspidistra alebo iná zeleň - overiť textúru.",
  },
  {
    src: "40",
    num: "010",
    name: "Ruža červená - zväzok",
    description:
      "Umelý zväzok červených ruží so zeleňou. Klasický aranžmán do vázy.",
    category: "Umelé kvety",
    subcategory: "kytice",
    druh: "ruze",
    colors: [{ label: "Červená", hex: HEX.cervena, photos: "1-3" }],
    match: "ruza-cervena-zvazok",
    status: "NA_ESHOPU",
    note: "Match ruza-cervena-zvazok / kytica-cervenych-ruzi…",
  },
  {
    src: "44",
    num: "011",
    name: "Kytica pivoniek biela",
    description:
      "Umelá kytica bielych pivoniek s púčikmi a zeleňou.",
    category: "Umelé kvety",
    subcategory: "kytice",
    druh: "pivonie",
    colors: [{ label: "Biela", hex: HEX.biela, photos: "1-3" }],
    match: "kytica-pivoniek",
    status: "NA_ESHOPU",
    note: "Match kytica-pivoniek (biela) / kytica-pivoniek-biela-puciky.",
  },
  {
    src: "45",
    num: "012",
    name: "Kytica pivoniek / hortenzií biela",
    description:
      "Umelá biela kytica plných kvetov (pivónia / hortenzia styl) so zubatými listami.",
    category: "Umelé kvety",
    subcategory: "kytice",
    druh: "pivonie",
    colors: [
      { label: "Biela", hex: HEX.biela, photos: "1-3" },
      { label: "Biela (2. sada)", hex: HEX.biela, photos: "4-6" },
    ],
    match: "kytica-pivoniek",
    status: "NEJISTE",
    note: "6 fotiek - biela kytica. Overiť pivónia vs hortenzia vs duplicita so 011.",
  },
  {
    src: "50",
    num: "013",
    name: "Georgína kytica tmavočervená",
    description:
      "Umelá kytica georgín v bordovej / tmavočervenej s drobnou bielou výplňou.",
    category: "Umelé kvety",
    subcategory: "kytice",
    druh: "georgina",
    colors: [{ label: "Bordová", hex: HEX.bordova, photos: "1-3" }],
    match: "georgina-kytica-tmavocervena",
    status: "NA_ESHOPU",
    note: "Match georgina-kytica-tmavocervena. 7 fotiek - skontrolovať poradie.",
  },
  {
    src: "52",
    num: "014",
    name: "Chryzantéma / georgína spray biela",
    description:
      "Umelý spray plných bielych kvetov s hviezdicovými okvetnými lístkami a zeleňou.",
    category: "Umelé kvety",
    subcategory: "stopkove-kvety",
    druh: "chryzantema",
    colors: [
      { label: "Biela", hex: HEX.biela, photos: "1-3" },
      { label: "NEJISTE dalsie farby", hex: "", photos: "4-18" },
    ],
    match: "chryzantema-pomponkova",
    status: "NEJISTE",
    note: "18 fotiek - viac farieb. Overiť chryzantéma vs georgína mini.",
  },
  {
    src: "54",
    num: "015",
    name: "Krásnoočko - cosmos",
    description:
      "Umelé krásnoočko (cosmos) s jemnými fialovo-bielymi okvetnými lístkami a žltým stredom.",
    category: "Umelé kvety",
    subcategory: "stopkove-kvety",
    druh: "krasnoocko",
    colors: [{ label: "Fialová", hex: HEX.fialova, photos: "1-3" }],
    match: "krasnoocko-cosmos",
    status: "NA_ESHOPU",
    note: "Match krasnoocko-cosmos. 7 fotiek - skontrolovať ďalšie farby.",
  },
  {
    src: "6",
    num: "016",
    name: "Hortenzia na stopke - žltá / oranžová",
    description:
      "Umelá hortenzia na stopke s hustým súkvetím v teplých žltých / oranžových tónoch.",
    category: "Umelé kvety",
    subcategory: "stopkove-kvety",
    druh: "hortenzia",
    colors: [
      { label: "Žltá", hex: HEX.zlta, photos: "1-3" },
      { label: "NEJISTE dalsie", hex: "", photos: "4-13" },
    ],
    match: "hortenzia-na-stonke",
    status: "OPRAVA",
    note: "13 fotiek - hortenzia multi-color. Match hortenzia-na-stonke / hortenzia-stonok.",
  },
  {
    src: "B1__1004CR",
    num: "017",
    name: "Hortenzia krémová",
    description:
      "Umelá hortenzia na stopke v krémovej / off-white farbe s veľkými zelenými listami.",
    category: "Umelé kvety",
    subcategory: "stopkove-kvety",
    druh: "hortenzia",
    colors: [{ label: "Krémová", hex: HEX.kremova, photos: "1-3" }],
    match: "hortenzia-kremova",
    status: "NA_ESHOPU",
    note: "Match hortenzia-kremova / hortenzia-stonok (biela/krémová).",
  },
];

const EMPTY_SKIP = [
  {
    src: "77DOKONCIT!!",
    status: "SKIP",
    note: "Složka je prázdná (0 souborů) - přeskočeno.",
  },
  {
    src: "B1__014_01_PREFOTIT",
    status: "SKIP",
    note: "Složka je prázdná - přeskočeno. Název PREFOTIT.",
  },
  {
    src: "B1__128YL_PREFOTIT",
    status: "SKIP",
    note: "Složka je prázdná - přeskočeno. Název PREFOTIT.",
  },
];

function listImages(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function writeMeta(item, outDir, imageCount) {
  const lines = [
    `nazov: ${item.name}`,
    `popis: ${item.description}`,
    `kategoria: ${item.category}`,
    `subkategoria: ${item.subcategory}`,
    `druh: ${item.druh}`,
    `zdroj_slozka: ${item.src}`,
    `stav: ${item.status}`,
    `match_slug: ${item.match || ""}`,
    `poznamka: ${item.note || ""}`,
    `pocet_fotiek: ${imageCount}`,
    "barvy:",
  ];
  for (const c of item.colors || []) {
    lines.push(
      `  - ${c.label}${c.hex ? ` (${c.hex})` : ""} -> fotky ${c.photos}`,
    );
  }
  fs.writeFileSync(path.join(outDir, "meta.txt"), lines.join("\n"), "utf8");
}

async function convertFolder(srcDir, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const files = listImages(srcDir);
  let i = 0;
  for (const file of files) {
    i += 1;
    const outName = String(i).padStart(2, "0") + ".webp";
    await sharp(path.join(srcDir, file))
      .rotate()
      .webp({ quality: QUALITY })
      .toFile(path.join(outDir, outName));
  }
  return i;
}

async function main() {
  fs.mkdirSync(CLEAN_ROOT, { recursive: true });
  const stavLines = [
    "batch\tsrc\tclean\tstatus\tmatch_slug\tname\tnote",
  ];

  for (const skip of EMPTY_SKIP) {
    stavLines.push(
      `1\t${skip.src}\t\t${skip.status}\t\t\t${skip.note}`,
    );
  }

  for (const item of BATCH) {
    const srcDir = path.join(SRC_ROOT, item.src);
    const folderName = `${item.num} ${item.status} ${item.name}`.replace(
      /[<>:"/\\|?*]/g,
      "-",
    );
    const outDir = path.join(CLEAN_ROOT, folderName);
    console.log("Processing", item.src, "->", folderName);
    const count = await convertFolder(srcDir, outDir);
    writeMeta(item, outDir, count);
    stavLines.push(
      [
        "1",
        item.src,
        folderName,
        item.status,
        item.match || "",
        item.name,
        (item.note || "").replace(/\t/g, " "),
      ].join("\t"),
    );
    console.log("  images:", count, "status:", item.status);
  }

  fs.writeFileSync(STAV_PATH, stavLines.join("\n") + "\n", "utf8");
  console.log("Wrote", STAV_PATH);
  console.log("Done batch 1:", BATCH.length, "products +", EMPTY_SKIP.length, "empty skips");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
