/**
 * Write simplified info.txt into each Paci Kvety folder from recatalog JSON.
 *
 * Format per product block:
 *   Názov / Zdrojová zložka / Typ / Popis / Farby / Cena
 * Multiple products in one folder → separate blocks with blank lines between.
 *
 * Usage: node scripts/write-paci-recatalog-info.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("public/products/Paci Kvety");
const CHUNK_DIR = path.resolve("scripts/paci-chunks");
const OUT_MERGED = path.resolve("scripts/paci-recatalog-merged.json");

/** True multi-product folders → one info.txt with several product blocks. */
const PRODUCT_SPLITS = {
  "45": [
    {
      name: "Pivoňka biela",
      type: "pivoňka",
      desc: "Umelá biela pivoňka s drobnými bielymi výplňovými kvetmi (hortenziový typ) a zelenými listami. Vhodná do vázy alebo aranžmánov.",
      colors: ["biela"],
    },
    {
      name: "Ruže červené",
      type: "ruža",
      desc: "Umelé tmavočervené ruže s drobnými hviezdicovými výplňovými kvetmi a zelenými listami. Vhodné do vázy alebo kytíc.",
      colors: ["červená"],
    },
  ],
  "77DOKONČIŤ!!": [
    {
      name: "Eukalyptus ružový",
      type: "eukalyptus",
      desc: "Umelý eukalyptus s okrúhlymi listami v prašnoružovom až mauve tóne. Dekoračná zeleň do vázy alebo aranžmánov.",
      colors: ["ružová"],
    },
    {
      name: "Perovitý filler fialový",
      type: "filler",
      desc: "Jemný perovitý kvitnúci filler vo fialovej farbe. Vhodný ako výplň do kytíc alebo do vázy.",
      colors: ["fialová"],
    },
  ],
  "B3__9681+9157_PREFOTIŤ": [
    {
      name: "Eryngium zelené",
      type: "eryngium",
      desc: "Umelé ostnaté hviezdicové vetvičky v zeleno-bielej farbe. Vhodné ako výplň alebo solitér.",
      colors: ["zelená"],
    },
    {
      name: "Klasový filler krémový",
      type: "filler",
      desc: "Jemný klasovitý filler v krémovej farbe. Vhodný ako výplň do kytíc.",
      colors: ["krémová"],
    },
  ],
  "F2__NARCIS": [
    {
      name: "Narcis žltý viackvetý",
      type: "narcis",
      desc: "Umelý viackvetý žltý narcis viazaný do zväzku. Vhodný do vázy alebo jarných aranžmánov.",
      variantIndexes: [0],
    },
    {
      name: "Narcis žltý s trúbkou",
      type: "narcis",
      desc: "Umelý klasický žltý narcis s výraznou trúbkou. Vhodný do vázy alebo jarných aranžmánov.",
      variantIndexes: [1],
    },
    {
      name: "Narcis bielo-žltý",
      type: "narcis",
      desc: "Umelý narcis s bielymi lístkami a žltým stredom. Vhodný do vázy alebo jarných aranžmánov.",
      colors: ["bielo-žltá"],
    },
  ],
};

function loadResults() {
  const all = [];
  const files = fs
    .readdirSync(CHUNK_DIR)
    .filter((name) => /^result-\d+\.json$/u.test(name))
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));

  for (const name of files) {
    const file = path.join(CHUNK_DIR, name);
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!Array.isArray(raw)) {
      throw new Error(`Expected array in ${file}`);
    }
    all.push(...raw);
  }
  return all;
}

function formatFarby(variants) {
  if (!variants || variants.length === 0) return "(doplní sa)";
  let cursor = 1;
  return variants
    .map((variant) => {
      const count = variant.photosOrdered?.length ?? 0;
      if (count === 0) return variant.color;
      const from = cursor;
      const to = cursor + count - 1;
      cursor = to + 1;
      const range = from === to ? String(from) : `${from}–${to}`;
      return `${variant.color} [${range}]`;
    })
    .join(" | ");
}

function cleanName(entry) {
  let name = (entry.name || "").trim();
  name = name.replace(/^Zmiešaná zložka\s*[–\-]\s*/iu, "");
  name = name.replace(/\s*[–\-]\s*mix\s*$/iu, "");
  name = name.replace(/^Mix\s+/iu, "");
  name = name.replace(/\s+mix\s*$/iu, "");
  if (!name || /^mix$/iu.test(name)) {
    const typeLabel =
      entry.type && entry.type !== "mix" ? entry.type : "kytica";
    const colors = (entry.variants || []).map((v) => v.color).filter(Boolean);
    name =
      colors.length === 1
        ? `${capitalize(typeLabel)} ${colors[0]}`
        : capitalize(typeLabel);
  }
  return capitalize(name);
}

function cleanType(entry) {
  if (!entry.type || entry.type === "mix") {
    return "kytica";
  }
  return entry.type;
}

function capitalize(value) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function pickVariants(entry, part) {
  if (Array.isArray(part.variantIndexes)) {
    return part.variantIndexes
      .map((index) => entry.variants?.[index])
      .filter(Boolean);
  }
  if (Array.isArray(part.colors)) {
    const wanted = new Set(part.colors);
    return (entry.variants || []).filter((variant) =>
      wanted.has(variant.color),
    );
  }
  return entry.variants || [];
}

function expandToProducts(entry) {
  const split = PRODUCT_SPLITS[entry.folder];
  if (split) {
    return split.map((part) => ({
      name: part.name,
      folder: entry.folder,
      type: part.type,
      desc: part.desc,
      variants: pickVariants(entry, part),
    }));
  }

  return [
    {
      name: cleanName(entry),
      folder: entry.folder,
      type: cleanType(entry),
      desc: entry.desc || "(doplní sa)",
      variants: entry.variants || [],
    },
  ];
}

function buildProductBlock(product) {
  return [
    `Názov: ${product.name}`,
    `Zdrojová zložka: ${product.folder}`,
    `Typ: ${product.type}`,
    `Popis: ${product.desc}`,
    `Farby: ${formatFarby(product.variants)}`,
    `Cena: 1,00 €`,
  ].join("\n");
}

function buildInfoTxt(entry) {
  const products = expandToProducts(entry);
  return `${products.map(buildProductBlock).join("\n\n\n")}\n`;
}

function main() {
  const results = loadResults();
  if (results.length === 0) {
    console.error("No catalog results yet.");
    process.exit(1);
  }

  fs.writeFileSync(OUT_MERGED, JSON.stringify(results, null, 2), "utf8");
  console.log(`Merged ${results.length} entries → ${OUT_MERGED}`);

  let written = 0;
  let productBlocks = 0;
  let missingFolder = 0;
  let splitFolders = 0;

  for (const entry of results) {
    const dir = path.join(ROOT, entry.folder);
    if (!fs.existsSync(dir)) {
      console.warn(`Folder missing: ${entry.folder}`);
      missingFolder += 1;
      continue;
    }
    const products = expandToProducts(entry);
    if (products.length > 1) splitFolders += 1;
    productBlocks += products.length;
    fs.writeFileSync(path.join(dir, "info.txt"), buildInfoTxt(entry), "utf8");
    written += 1;
  }

  console.log(
    `Wrote info.txt: ${written} folders, ${productBlocks} product blocks, split folders: ${splitFolders}, missing: ${missingFolder}`,
  );
}

main();
