const fs = require("fs");
const path = require("path");

const base = path.join(__dirname, "..");
const uuids = JSON.parse(
  fs.readFileSync(path.join(__dirname, "_matched-uuids.json"), "utf8"),
);

function parseTsv(file) {
  const lines = fs.readFileSync(file, "utf8").trim().split("\n").slice(1);
  return lines.map((l) => {
    const cols = l.split("\t");
    return cols;
  });
}

const drive = parseTsv(path.join(__dirname, "organize-drive-report.tsv"));
const ii = parseTsv(path.join(__dirname, "organize-ii-report.tsv"));

const driveOrigs = new Set(drive.map((c) => c[2]));
const iiOrigs = new Set(ii.map((c) => c[1]));
const allOrigs = new Set([...driveOrigs, ...iiOrigs]);
const both = [...driveOrigs].filter((o) => iiOrigs.has(o));

const driveNa = drive.filter((c) => c[3] === "NA_ESHOPU").length;
const driveNeni = drive.filter((c) => c[3] === "NENI_NA_ESHOPU").length;
const iiNa = ii.filter((c) => c[2] === "NA_ESHOPU").length;

console.log(JSON.stringify({
  uniqueImageUuids: uuids.length,
  driveFolders: drive.length,
  iiFolders: ii.length,
  totalFolders: drive.length + ii.length,
  driveNa,
  driveNeni,
  iiNa,
  uniqueOrigNamesDrive: driveOrigs.size,
  uniqueOrigNamesIi: iiOrigs.size,
  uniqueOrigNamesCombined: allOrigs.size,
  origNamesInBothSections: both.length,
  estimatedUniqueRawProducts: allOrigs.size,
}, null, 2));
