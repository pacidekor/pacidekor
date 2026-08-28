/**
 * Merge back over-split folders that are clearly color variants of ONE product.
 * Sources to re-merge (from split-report / visual sense):
 */
const fs = require("fs");
const path = require("path");

const LIST = path.join(__dirname, "..", "katalog_raw", "list");

// prefix of list folders that belong together -> keep lowest number, move images in
const MERGE_GROUPS = [
  // from 058 (13) over-split
  ["078", "079", "080", "081", "082"],
  // from 093
  ["098", "099", "100", "101"],
  // from 095
  ["102", "103"],
  // from 107 SUN-455 colors
  ["111", "112", "113", "114", "115", "116", "117", "118"],
  // from 110 peony kytica colors
  ["119", "120", "121", "122", "123", "124", "125", "126", "127"],
  // from 118 rose kytica
  ["130", "131", "132", "133"],
  // from 125
  ["138", "139", "140"],
  // from 136 rose beauty colors
  ["148", "149", "150"],
  // from 138
  ["151", "152", "153"],
];

function listDirs() {
  return fs
    .readdirSync(LIST, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function findDir(num) {
  return listDirs().find((n) => n === num || n.startsWith(num));
}

function images(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
}

for (const group of MERGE_GROUPS) {
  const existing = group.map(findDir).filter(Boolean);
  if (existing.length < 2) {
    console.log("skip group", group.join(","), "found", existing.length);
    continue;
  }
  const primary = path.join(LIST, existing[0]);
  for (let i = 1; i < existing.length; i++) {
    const other = path.join(LIST, existing[i]);
    for (const f of fs.readdirSync(other)) {
      const from = path.join(other, f);
      if (!fs.statSync(from).isFile()) continue;
      if (f === "meta.txt" || f === "zdroj.txt") continue;
      let dest = path.join(primary, f);
      if (fs.existsSync(dest)) {
        const ext = path.extname(f);
        const base = path.basename(f, ext);
        dest = path.join(primary, `${base}__from${existing[i]}${ext}`);
      }
      fs.renameSync(from, dest);
    }
    fs.rmSync(other, { recursive: true, force: true });
    console.log("merged", existing[i], "->", existing[0]);
  }
  const imgs = images(primary);
  fs.writeFileSync(
    path.join(primary, "meta.txt"),
    `cislo: ${existing[0]}\nfotky: ${imgs.length}\nstav: ke_kontrole_eshop\npoznamka: sloučeno zpět (barevné varianty 1 produktu)\n`,
    "utf8",
  );
  console.log("primary", existing[0], "now", imgs.length, "images");
}

// renumber everything sequentially 001..N
const dirs = listDirs()
  .filter((n) => n !== "README.txt")
  .sort((a, b) => a.localeCompare(b, "sk", { numeric: true }));

// phase1 temp
dirs.forEach((name, i) => {
  const tmp = `__tmp_${String(i + 1).padStart(4, "0")}`;
  fs.renameSync(path.join(LIST, name), path.join(LIST, tmp));
});

const tmps = fs
  .readdirSync(LIST)
  .filter((n) => n.startsWith("__tmp_"))
  .sort();

const index = ["cislo\tfotek\tpoznamka"];
tmps.forEach((tmp, i) => {
  const num = String(i + 1).padStart(3, "0");
  const dest = path.join(LIST, num);
  fs.renameSync(path.join(LIST, tmp), dest);
  const imgs = images(dest);
  let note = "";
  const meta = path.join(dest, "meta.txt");
  if (fs.existsSync(meta)) {
    note = fs
      .readFileSync(meta, "utf8")
      .replace(/\s+/g, " ")
      .slice(0, 100);
  }
  fs.writeFileSync(
    meta,
    `cislo: ${num}\nfotky: ${imgs.length}\nstav: ke_kontrole_eshop\n`,
    "utf8",
  );
  index.push(`${num}\t${imgs.length}\t${note}`);
  console.log("renum", num, imgs.length);
});

fs.writeFileSync(
  path.join(__dirname, "INDEX-list.tsv"),
  index.join("\n") + "\n",
  "utf8",
);
console.log("TOTAL", tmps.length);
