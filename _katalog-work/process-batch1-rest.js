/**
 * Finish batch 1: process 3 folders with diacritics in names (ČIŤ / PREFOTIŤ).
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const SRC_ROOT = path.join(__dirname, "..", "katalog_raw", "produktyznovu");
const CLEAN_ROOT = path.join(__dirname, "clean");
const STAV_PATH = path.join(__dirname, "STAV.tsv");
const TMP = path.join(__dirname, "_tmp-preview");

const HEX = {
  zlta: "#E0C35A",
};

function findDir(re) {
  return fs
    .readdirSync(SRC_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .find((n) => re.test(n));
}

function listImages(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

async function convert(srcDir, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const files = listImages(srcDir);
  let i = 0;
  for (const file of files) {
    i += 1;
    await sharp(path.join(srcDir, file))
      .rotate()
      .webp({ quality: 85 })
      .toFile(path.join(outDir, String(i).padStart(2, "0") + ".webp"));
  }
  return i;
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

async function main() {
  const n77 = findDir(/77DOKON/i);
  const n014 = findDir(/B1__014/i);
  const n128 = findDir(/B1__128/i);
  if (!n77 || !n014 || !n128) {
    throw new Error(
      "Missing dirs: " + JSON.stringify({ n77, n014, n128 }),
    );
  }
  console.log("Found:", { n77, n014, n128 });

  fs.mkdirSync(TMP, { recursive: true });
  for (const [label, dir] of [
    ["77", n77],
    ["b014", n014],
    ["b128", n128],
  ]) {
    const first = listImages(path.join(SRC_ROOT, dir))[0];
    fs.copyFileSync(
      path.join(SRC_ROOT, dir, first),
      path.join(TMP, label + ".jpg"),
    );
  }

  const items = [
    {
      src: n77,
      num: "018",
      name: "DOKONCIT - nedokoncene",
      description:
        "Nedokončená složka z raw dumpů - vyžaduje identifikaci druhu a barev.",
      category: "Umelé kvety",
      subcategory: "",
      druh: "",
      colors: [{ label: "NEJISTE", hex: "", photos: "1-6" }],
      match: "",
      status: "NEJISTE",
      note: "Složka 77DOKONČIŤ!! - identifikace po prohlédnutí.",
    },
    {
      src: n014,
      num: "019",
      name: "B1 014 PREFOTIT",
      description: "Raw fotky označené PREFOTIT - kvalita / přefocení.",
      category: "Umelé kvety",
      subcategory: "",
      druh: "",
      colors: [{ label: "NEJISTE", hex: "", photos: "1-6" }],
      match: "",
      status: "PREFOTIT",
      note: "PREFOTIŤ v názvu složky.",
    },
    {
      src: n128,
      num: "020",
      name: "B1 128YL PREFOTIT",
      description:
        "Raw fotky označené PREFOTIT (YL = pravděpodobně žlutá).",
      category: "Umelé kvety",
      subcategory: "",
      druh: "",
      colors: [{ label: "Žltá?", hex: HEX.zlta, photos: "1-7" }],
      match: "",
      status: "PREFOTIT",
      note: "PREFOTIŤ v názvu složky.",
    },
  ];

  const extra = [];
  for (const item of items) {
    const folderName = `${item.num} ${item.status} ${item.name}`.replace(
      /[<>:"/\\|?*]/g,
      "-",
    );
    const outDir = path.join(CLEAN_ROOT, folderName);
    console.log("Processing", item.src, "->", folderName);
    const count = await convert(path.join(SRC_ROOT, item.src), outDir);
    writeMeta(item, outDir, count);
    extra.push(
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
    console.log("  images:", count, item.status);
  }

  let lines = fs
    .readFileSync(STAV_PATH, "utf8")
    .split(/\r?\n/)
    .filter(Boolean);
  lines = lines.filter(
    (l) => !(/\tSKIP\t/.test(l) && /(77DOKON|B1__014|B1__128)/.test(l)),
  );
  lines.push(...extra);
  fs.writeFileSync(STAV_PATH, lines.join("\n") + "\n", "utf8");
  console.log("STAV updated, previews in", TMP);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
