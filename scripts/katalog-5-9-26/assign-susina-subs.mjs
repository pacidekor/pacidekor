/**
 * Assign Sušina products to subcategories (Stuhy-style).
 * Skip *hotovo folders.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("katalog_raw/noveprodukty5.9.26-ready-v4");

function parseInfo(text) {
  const data = {};
  for (const line of text.replace(/\r\n/g, "\n").trim().split("\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    data[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return data;
}

function writeInfo(dir, fields) {
  fs.writeFileSync(
    path.join(dir, "info.txt"),
    [
      `Názov: ${fields.name}`,
      `Popis: ${fields.description}`,
      `Farby: ${fields.farby}`,
      `Druh: ${fields.druh}`,
      `Kategória: ${fields.category}`,
      `Subkategória: ${fields.subcategory}`,
      `Zdrojová zložka: ${fields.sourceFolder}`,
    ].join("\n") + "\n",
    "utf8",
  );
}

/** Explicit ID -> subcategory */
const SUB_BY_ID = {
  // Sušené plody
  78: "Sušené plody",
  89: "Sušené plody",
  95: "Sušené plody",
  98: "Sušené plody",
  103: "Sušené plody",
  111: "Sušené plody",
  118: "Sušené plody",
  131: "Sušené plody",
  136: "Sušené plody",
  137: "Sušené plody",
  139: "Sušené plody",
  // drobné šištičky = šišky group better
  79: "Šišky",

  // Lotos
  77: "Lotos",
  91: "Lotos",
  94: "Lotos",
  106: "Lotos",

  // Bell Cup / kalíšky
  80: "Bell Cup / kalíšky",
  93: "Bell Cup / kalíšky",
  113: "Bell Cup / kalíšky",
  114: "Bell Cup / kalíšky",
  129: "Bell Cup / kalíšky",
  132: "Bell Cup / kalíšky",

  // Cédrové a drevené ružičky
  83: "Cédrové a drevené ružičky",
  84: "Cédrové a drevené ružičky",
  85: "Cédrové a drevené ružičky",
  96: "Cédrové a drevené ružičky",
  99: "Cédrové a drevené ružičky",
  143: "Cédrové a drevené ružičky",
  // 144 stays Ostatné until confirmed

  // Šišky
  101: "Šišky",
  133: "Šišky",

  // Bobule a vetvičky
  104: "Bobule a vetvičky",
  123: "Bobule a vetvičky",

  // Tekvice
  121: "Tekvice",
  122: "Tekvice",

  // Drevené doplnky
  81: "Drevené doplnky",
  127: "Drevené doplnky",
  138: "Drevené doplnky",

  // Mach
  92: "Mach",

  // Ostatné sušiny
  88: "Ostatné sušiny",
  100: "Ostatné sušiny",
  102: "Ostatné sušiny",
  109: "Ostatné sušiny",
  112: "Ostatné sušiny",
  117: "Ostatné sušiny",
  130: "Ostatné sušiny",
  144: "Ostatné sušiny",
};

function inferSub(name, druh) {
  const n = `${name} ${druh}`.toLowerCase();
  if (/lotos/i.test(n)) return "Lotos";
  if (/bell cup|kalich|kalíš/i.test(n)) return "Bell Cup / kalíšky";
  if (/cédrov|drevená ruži|drevená hlava|drevená hlav/i.test(n))
    return "Cédrové a drevené ružičky";
  if (/šišk|šištič/i.test(n)) return "Šišky";
  if (/bobu[ľl]|vetvič/i.test(n)) return "Bobule a vetvičky";
  if (/tekvic/i.test(n)) return "Tekvice";
  if (/špirál|zvitk/i.test(n)) return "Drevené doplnky";
  if (/mach/i.test(n)) return "Mach";
  if (/hviezdic|plod|tobolk|škrupin/i.test(n)) return "Sušené plody";
  return "Ostatné sušiny";
}

const changes = [];
const skipped = [];

for (const ent of fs.readdirSync(ROOT, { withFileTypes: true })) {
  if (!ent.isDirectory()) continue;
  if (/hotovo/i.test(ent.name)) {
    skipped.push(ent.name);
    continue;
  }
  if (!/^\d+$/.test(ent.name)) continue;

  const dir = path.join(ROOT, ent.name);
  const infoPath = path.join(dir, "info.txt");
  if (!fs.existsSync(infoPath)) continue;

  const info = parseInfo(fs.readFileSync(infoPath, "utf8"));
  if (info["Kategória"] !== "Sušina") continue;

  const sub =
    SUB_BY_ID[ent.name] ||
    inferSub(info["Názov"] || "", info["Druh"] || "");

  writeInfo(dir, {
    name: info["Názov"],
    description: info["Popis"],
    farby: info["Farby"] ?? "",
    druh: info["Druh"],
    category: "Sušina",
    subcategory: sub,
    sourceFolder: info["Zdrojová zložka"],
  });

  changes.push({
    id: ent.name,
    name: info["Názov"],
    sub,
  });
}

const bySub = new Map();
for (const c of changes) {
  if (!bySub.has(c.sub)) bySub.set(c.sub, []);
  bySub.get(c.sub).push(c.id);
}

console.log(
  JSON.stringify(
    {
      changed: changes.length,
      skippedHotovo: skipped.length,
      bySub: Object.fromEntries(
        [...bySub.entries()]
          .sort()
          .map(([k, v]) => [k, { count: v.length, ids: v }]),
      ),
    },
    null,
    2,
  ),
);

fs.mkdirSync("scripts/katalog-5-9-26/v4-reports", { recursive: true });
fs.writeFileSync(
  "scripts/katalog-5-9-26/v4-reports/susina-subkategorie.json",
  JSON.stringify({ changes, skipped, bySub: Object.fromEntries(bySub) }, null, 2),
);
