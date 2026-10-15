import fs from "fs";
import path from "path";

const ROOT = path.resolve(".");
const CHUNKS = path.join(ROOT, "scripts/910produkty/chunks");
const INV = JSON.parse(
  fs.readFileSync(path.join(ROOT, "scripts/910produkty/inventory.json"), "utf8"),
)
  .filter((p) => p.images.length > 0)
  .sort((a, b) => {
    const ka = `${a.batch}|${a.group || ""}|${a.folder}`;
    const kb = `${b.batch}|${b.group || ""}|${b.folder}`;
    return ka.localeCompare(kb, "sk", { numeric: true });
  });

const MANIFEST = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, "scripts/910produkty/thumbs/manifest.json"),
    "utf8",
  ),
);

function productKey(p) {
  return `${p.batch}::${p.group || ""}::${p.folder}`;
}

const byId = new Map();
for (const file of fs.readdirSync(CHUNKS).filter((f) => /-result\.json$/i.test(f))) {
  const arr = JSON.parse(fs.readFileSync(path.join(CHUNKS, file), "utf8"));
  if (!Array.isArray(arr)) continue;
  for (const e of arr) byId.set(Number(e.id), e);
}

const CATEGORIES = new Set([
  "Umelé kvety",
  "Sušina",
  "Stuhy",
  "Aranž. materiál",
  "Obalový materiál",
  "Keramika",
  "Vencové základy",
  "Košíky",
  "Svietniky",
  "Flowerboxy",
]);

const catalog = [];
const missing = [];
const issues = [];

for (let i = 0; i < INV.length; i++) {
  const inv = INV[i];
  const id = i + 1;
  const meta = MANIFEST.find((m) => m.id === id) || {};
  const e = byId.get(id);
  if (!e) {
    missing.push(id);
    continue;
  }

  const allPhotos = Array.from({ length: inv.images.length }, (_, j) => j + 1);
  let groups = Array.isArray(e.groups) ? e.groups : [];
  groups = groups
    .map((g) => ({
      color: String(g.color || "")
        .trim()
        .toLowerCase(),
      photos: (Array.isArray(g.photos) ? g.photos : [])
        .map(Number)
        .filter((n) => n >= 1 && n <= inv.images.length),
    }))
    .filter((g) => g.color && g.photos.length);

  if (!groups.length) {
    groups = [{ color: "prírodná", photos: allPhotos }];
    issues.push({ id, issue: "empty-groups-fallback" });
  }

  const covered = new Set(groups.flatMap((g) => g.photos));
  const missPhotos = allPhotos.filter((n) => !covered.has(n));
  if (missPhotos.length) {
    groups[0].photos = [...new Set([...groups[0].photos, ...missPhotos])].sort(
      (a, b) => a - b,
    );
    issues.push({ id, issue: "filled-missing-photos", photos: missPhotos });
  }

  const category = CATEGORIES.has(e.category) ? e.category : "Umelé kvety";
  if (!CATEGORIES.has(e.category)) {
    issues.push({ id, issue: "bad-category", value: e.category });
  }

  catalog.push({
    id,
    sourceKey: productKey(inv),
    sourceFolder: inv.folder,
    sourcePath: inv.path,
    batch: inv.batch,
    group: inv.group,
    imageCount: inv.images.length,
    videos: inv.videos || [],
    name: String(e.name || inv.folder).trim(),
    description: String(e.description || "").trim(),
    category,
    subcategory: String(e.subcategory || "").trim(),
    druh: String(e.druh || "").trim(),
    groups,
    confidence: Number(e.confidence) || 0,
    notes: String(e.notes || "").trim(),
  });
}

fs.writeFileSync(
  path.join(ROOT, "scripts/910produkty/catalog.json"),
  JSON.stringify(catalog, null, 2),
  "utf8",
);
fs.writeFileSync(
  path.join(ROOT, "scripts/910produkty/merge-report.json"),
  JSON.stringify({ total: catalog.length, missing, issues }, null, 2),
  "utf8",
);

console.log("catalog", catalog.length, "/", INV.length);
console.log("missing ids", missing);
console.log("issues", issues.length);

const byCat = {};
for (const p of catalog) byCat[p.category] = (byCat[p.category] || 0) + 1;
console.log("by category", byCat);

const withVid = catalog.filter((p) => p.videos?.length);
console.log(
  "with video",
  withVid.map((p) => ({ id: p.id, name: p.name, path: p.sourcePath, videos: p.videos })),
);
