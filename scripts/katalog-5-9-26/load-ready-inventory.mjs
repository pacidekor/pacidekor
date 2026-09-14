/**
 * Load all info.txt from a ready catalog into structured JSON.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.argv[2] || "katalog_raw/noveprodukty5.9.26-ready";
const OUT = process.argv[3] || "scripts/katalog-5-9-26/ready-inventory.json";

function parseInfo(text) {
  const lines = text.replace(/\r\n/g, "\n").trim().split("\n");
  const data = {};
  for (const line of lines) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    const value = line.slice(i + 1).trim();
    data[key] = value;
  }
  return data;
}

function parseFarby(farby) {
  if (!farby) return [];
  return farby.split("|").map((part) => {
    const m = part.trim().match(/^(.+?)\s*\[([^\]]+)\]\s*$/);
    if (!m) return { color: part.trim(), range: null, photos: [] };
    const color = m[1].trim();
    const range = m[2].trim();
    const photos = [];
    if (range.includes("-")) {
      const [a, b] = range.split("-").map((x) => Number(x.trim()));
      for (let n = a; n <= b; n++) photos.push(n);
    } else {
      photos.push(Number(range));
    }
    return { color, range, photos };
  });
}

const dirs = fs
  .readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^\d+$/.test(d.name))
  .map((d) => d.name)
  .sort((a, b) => Number(a) - Number(b));

const items = [];
for (const id of dirs) {
  const dir = path.join(ROOT, id);
  const files = fs.readdirSync(dir);
  const webps = files
    .filter((f) => f.endsWith(".webp"))
    .map((f) => Number(f.replace(".webp", "")))
    .sort((a, b) => a - b);
  const infoPath = path.join(dir, "info.txt");
  const raw = fs.readFileSync(infoPath, "utf8");
  const info = parseInfo(raw);
  items.push({
    id,
    name: info["Názov"] || "",
    description: info["Popis"] || "",
    farbyRaw: info["Farby"] || "",
    farby: parseFarby(info["Farby"] || ""),
    druh: info["Druh"] || "",
    category: info["Kategória"] || "",
    subcategory: info["Subkategória"] || "",
    sourceFolder: info["Zdrojová zložka"] || "",
    webps,
    webpCount: webps.length,
  });
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(items, null, 2), "utf8");
console.log("loaded", items.length, "->", OUT);
