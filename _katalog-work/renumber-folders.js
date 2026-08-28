/**
 * Renumber katalog_raw/produktyznovu folders to 001, 002, … (no AI naming).
 * Saves INDEX.tsv with original names. Puts -II last.
 *
 * Run: node _katalog-work/renumber-folders.js
 */
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "katalog_raw", "produktyznovu");
const INDEX = path.join(__dirname, "INDEX.tsv");
const CLEAN = path.join(__dirname, "clean");

function listDirs() {
  return fs
    .readdirSync(SRC, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function countImages(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).length;
}

function sortFolders(names) {
  const specialLast = new Set(["-II"]);
  const numeric = [];
  const other = [];
  const last = [];

  for (const name of names) {
    if (specialLast.has(name)) {
      last.push(name);
      continue;
    }
    if (/^\d+$/.test(name)) numeric.push(name);
    else other.push(name);
  }

  numeric.sort((a, b) => Number(a) - Number(b));
  other.sort((a, b) =>
    a.localeCompare(b, "sk", { numeric: true, sensitivity: "base" }),
  );
  return [...numeric, ...other, ...last];
}

function main() {
  // Already renumbered? detect 001-style only
  const current = listDirs();
  const already = current.every((n) => /^\d{3}$/.test(n));
  if (already) {
    console.log("Uz očíslováno (", current.length, "). Končím.");
    return;
  }

  const ordered = sortFolders(current);
  console.log("Složek:", ordered.length);

  // Phase 1: rename to temp unique names to avoid collisions
  const temps = [];
  for (let i = 0; i < ordered.length; i++) {
    const from = ordered[i];
    const tmp = `__tmp_${String(i + 1).padStart(4, "0")}__`;
    fs.renameSync(path.join(SRC, from), path.join(SRC, tmp));
    temps.push({ tmp, original: from });
  }

  // Phase 2: rename to 001, 002, … + write zdroj.txt
  const rows = ["cislo\tpovodni_slozka\tpocet_fotek"];
  for (let i = 0; i < temps.length; i++) {
    const num = String(i + 1).padStart(3, "0");
    const { tmp, original } = temps[i];
    const dest = path.join(SRC, num);
    fs.renameSync(path.join(SRC, tmp), dest);
    const imgs = countImages(dest);
    fs.writeFileSync(
      path.join(dest, "zdroj.txt"),
      `povodni: ${original}\ncislo: ${num}\nfotky: ${imgs}\n`,
      "utf8",
    );
    rows.push(`${num}\t${original}\t${imgs}`);
    console.log(num, "<-", original, `(${imgs})`);
  }

  fs.writeFileSync(INDEX, rows.join("\n") + "\n", "utf8");
  console.log("INDEX:", INDEX);

  // Drop wrong AI-named clean batch
  if (fs.existsSync(CLEAN)) {
    fs.rmSync(CLEAN, { recursive: true, force: true });
    console.log("Smazáno _katalog-work/clean (špatné AI názvy)");
  }

  // Replace STAV with simple checklist template
  fs.writeFileSync(
    path.join(__dirname, "STAV.md"),
    `# Inventura katalogu (ruční)

Složky v \`katalog_raw/produktyznovu/\` jsou očíslované **001 … ${String(ordered.length).padStart(3, "0")}**.

Mapování: \`_katalog-work/INDEX.tsv\` (číslo → původní název + počet fotek).

V každé složce je \`zdroj.txt\` s původním názvem.

## Postup
1. Otevři složku podle čísla
2. Porovnej s e-shopem
3. Do \`INDEX.tsv\` / poznámek si označ: OK / CHYBÍ / OPRAVA / SKIP

Žádné AI párování názvů.
`,
    "utf8",
  );

  console.log("Hotovo.");
}

main();
