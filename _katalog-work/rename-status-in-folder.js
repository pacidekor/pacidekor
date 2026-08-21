/**
 * Rename clean folders to include STATUS in the name.
 * Format: `{num} {STATUS} {name}`
 */
const fs = require("fs");
const path = require("path");

const CLEAN = path.join(__dirname, "clean");
const STAV = path.join(__dirname, "STAV.tsv");

const lines = fs.readFileSync(STAV, "utf8").split(/\r?\n/).filter(Boolean);
const header = lines[0];
const rows = lines.slice(1).map((line) => {
  const [batch, src, clean, status, match, name, note] = line.split("\t");
  return { batch, src, clean, status, match, name, note, raw: line };
});

const dirs = fs.readdirSync(CLEAN, { withFileTypes: true }).filter((d) => d.isDirectory());

function findDir(num) {
  const re = new RegExp("^" + num + "\\b");
  return dirs.find((d) => re.test(d.name));
}

const newLines = [header];

for (const row of rows) {
  const num = row.clean.match(/^(\d{3})/)?.[1];
  if (!num) {
    newLines.push(row.raw);
    continue;
  }
  const dir = findDir(num);
  if (!dir) {
    console.warn("missing dir for", num);
    newLines.push(row.raw);
    continue;
  }

  // Strip trailing status tokens from product name if duplicated
  let productName = row.name
    .replace(/\s*\/\s*/g, " - ")
    .replace(/\s+PREFOTIT\s*$/i, "")
    .replace(/\s+OPRAVA\s*$/i, "")
    .replace(/\s+NEJISTE\s*$/i, "")
    .replace(/\s+NA_ESHOPU\s*$/i, "")
    .trim();

  const newName = `${num} ${row.status} ${productName}`.replace(
    /[<>:"/\\|?*]/g,
    "-",
  );

  const from = path.join(CLEAN, dir.name);
  const to = path.join(CLEAN, newName);
  if (dir.name !== newName) {
    if (fs.existsSync(to)) {
      throw new Error("target exists: " + newName);
    }
    fs.renameSync(from, to);
    console.log(dir.name, "->", newName);
  } else {
    console.log("ok", newName);
  }

  newLines.push(
    [
      row.batch,
      row.src,
      newName,
      row.status,
      row.match,
      productName,
      row.note || "",
    ].join("\t"),
  );
}

fs.writeFileSync(STAV, newLines.join("\n") + "\n", "utf8");
console.log("STAV.tsv updated");
