/**
 * Build katalog_raw/list/001+ from single-product folders (3 imgs).
 * Multi-product candidates -> katalog_raw/ke-rozdeleni/
 * Prefotit / II already quarantined.
 */
const fs = require("fs");
const path = require("path");

const BASE = path.join(__dirname, "..", "katalog_raw");
const SRC = path.join(BASE, "produktyznovu");
const LIST = path.join(BASE, "list");
const MULTI = path.join(BASE, "ke-rozdeleni");

function ensure(d) {
  fs.mkdirSync(d, { recursive: true });
}

function listImages(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && /\.(jpe?g|png|webp)$/i.test(d.name))
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function readZdroj(dir) {
  const p = path.join(dir, "zdroj.txt");
  if (!fs.existsSync(p)) return "";
  return fs.readFileSync(p, "utf8").trim();
}

function moveDir(from, toDir, name) {
  ensure(toDir);
  let dest = path.join(toDir, name);
  let i = 2;
  while (fs.existsSync(dest)) {
    dest = path.join(toDir, `${name}__${i}`);
    i++;
  }
  fs.renameSync(from, dest);
  return dest;
}

ensure(LIST);
ensure(MULTI);

// wipe previous list numbering if re-run
if (fs.existsSync(LIST)) {
  for (const n of fs.readdirSync(LIST)) {
    fs.rmSync(path.join(LIST, n), { recursive: true, force: true });
  }
}

const dirs = fs
  .readdirSync(SRC, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort((a, b) => a.localeCompare(b, "sk", { numeric: true }));

const indexRows = ["cislo\tfotek\tpovodni_nazev_slozky\tzdroj\tpoznamka"];
let n = 0;
let multiCount = 0;

for (const name of dirs) {
  const from = path.join(SRC, name);
  const images = listImages(from);
  const zdroj = readZdroj(from);

  if (images.length === 0) {
    console.log("SKIP empty", name);
    continue;
  }

  if (images.length > 3) {
    const dest = moveDir(from, MULTI, name);
    multiCount++;
    console.log("MULTI", images.length, "-> ke-rozdeleni/", path.basename(dest));
    continue;
  }

  // 1–3 images = one product folder
  n += 1;
  const num = String(n).padStart(3, "0");
  const dest = path.join(LIST, num);
  fs.renameSync(from, dest);
  fs.writeFileSync(
    path.join(dest, "meta.txt"),
    [
      `cislo: ${num}`,
      `fotky: ${images.length}`,
      `povodni_slozka: ${name}`,
      zdroj ? `zdroj:\n${zdroj}` : "",
      `stav: ke_kontrole_eshop`,
      "",
    ]
      .filter(Boolean)
      .join("\n"),
    "utf8",
  );
  indexRows.push(
    `${num}\t${images.length}\t${name.replace(/\t/g, " ")}\t${zdroj.replace(/\t|\n/g, " ").slice(0, 120)}\t1 produkt (≤3 fotky)`,
  );
  console.log("LIST", num, images.length, name);
}

fs.writeFileSync(
  path.join(__dirname, "INDEX-list.tsv"),
  indexRows.join("\n") + "\n",
  "utf8",
);

fs.writeFileSync(
  path.join(MULTI, "README.txt"),
  `Složky s VÍCE než 3 fotkami — často víc barev stejného produktu NEBO víc produktů smíchaných.

Projdi je a rozděl tak, aby 1 složka = 1 produkt (typicky 3 fotky).
Pak je přesuň do katalog_raw/list/ a přečísluj.

Počet multi složek teď: ${multiCount}
`,
  "utf8",
);

fs.writeFileSync(
  path.join(LIST, "README.txt"),
  `Čistý seznam produktů k ruční kontrole vs e-shop.

Formát: 001, 002, … (${n} položek)
Každá složka = 1 produkt (1–3 fotky).
PREFOTIT je v katalog_raw/prefotit/
II guláš je v katalog_raw/ii-gulas/
Vícenásobné/nejasné jsou v katalog_raw/ke-rozdeleni/
`,
  "utf8",
);

console.log("\nDONE list:", n, "multi:", multiCount);
