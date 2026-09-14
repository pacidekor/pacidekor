/**
 * Remap Kategória/Subkategória in ready-v4 info.txt to live e-shop taxonomy.
 * Skips *hotovo folders. Does not change photos or names.
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
  const lines = [
    `Názov: ${fields.name}`,
    `Popis: ${fields.description}`,
    `Farby: ${fields.farby}`,
    `Druh: ${fields.druh}`,
    `Kategória: ${fields.category}`,
    `Subkategória: ${fields.subcategory}`,
    `Zdrojová zložka: ${fields.sourceFolder}`,
  ];
  fs.writeFileSync(path.join(dir, "info.txt"), lines.join("\n") + "\n", "utf8");
}

/**
 * Map product to live shop category/subcategory.
 * Returns null if no confident mapping (leave as-is).
 * Exact subcategory labels from DB.
 */
function mapTaxonomy(id, name, druh, category, subcategory) {
  const n = `${name} ${druh}`.toLowerCase();

  // --- Stuhy (top-level category in shop) ---
  if (
    subcategory === "Stuhy" ||
    /stuha|páska/i.test(name) ||
    /stuha|páska/i.test(druh)
  ) {
    if (/satén/i.test(n)) {
      return { category: "Stuhy", subcategory: "Saténové stuhy" };
    }
    if (/jut/i.test(n)) {
      return { category: "Stuhy", subcategory: "Jutové stuhy" };
    }
    if (/károvan/i.test(n)) {
      return { category: "Stuhy", subcategory: "Kárované stuhy" };
    }
    if (/margarét/i.test(n)) {
      return { category: "Stuhy", subcategory: "Margarétkové stuhy" };
    }
    if (/samet/i.test(n)) {
      return { category: "Stuhy", subcategory: "Sametové stuhy" };
    }
    if (/pohrebn/i.test(n)) {
      return { category: "Stuhy", subcategory: "Pohrebné stuhy" };
    }
    // generic decorative ribbons
    return { category: "Stuhy", subcategory: "Dekoratívné stuhy" };
  }

  // --- Florist supplies → Aranž. materiál (no sub in shop) ---
  if (subcategory === "Floristické potreby") {
    // packaging nets that match Obalový materiál
    if (/sieťk/i.test(n) && /pavučin|hačkov/i.test(n)) {
      return { category: "Obalový materiál", subcategory: "Sieťka hačkovaná" };
    }
    if (/sieťk/i.test(n) && /plast/i.test(n)) {
      return { category: "Obalový materiál", subcategory: "Sieťka plastová" };
    }
    if (/sieťk/i.test(n) && /jut/i.test(n)) {
      return { category: "Obalový materiál", subcategory: "Jutová sieťka" };
    }
    if (/sieťk/i.test(n) && /sisal/i.test(n)) {
      return { category: "Obalový materiál", subcategory: "Sisalová sieťka" };
    }
    return { category: "Aranž. materiál", subcategory: "" };
  }

  // --- Natural materials → Sušina ---
  if (subcategory === "Prírodniny") {
    return { category: "Sušina", subcategory: "" };
  }

  // --- Wreath ---
  if (subcategory === "Vence" || /veniec/i.test(n)) {
    return { category: "Vencové základy", subcategory: "" };
  }

  // --- Dekorácie / Doplnky that are clearly dried/natural ---
  if (category === "Dekorácie" && subcategory === "Doplnky") {
    if (/sisal/i.test(n) || /kokos/i.test(n) || /jut.*vrec/i.test(n) || /vrecúšk/i.test(n)) {
      return { category: "Aranž. materiál", subcategory: "" };
    }
    // artificial moss filler → keep as flower accessory
    if (/umelý mach|zeleň/i.test(n)) {
      return { category: "Umelé kvety", subcategory: "Doplnky" };
    }
    // rest of natural décor → Sušina
    return { category: "Sušina", subcategory: "" };
  }

  // Umelé kvety already correct for most
  if (category === "Umelé kvety") {
    return null; // keep
  }

  return null;
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
  const before = {
    category: info["Kategória"] || "",
    subcategory: info["Subkategória"] || "",
  };

  const mapped = mapTaxonomy(
    ent.name,
    info["Názov"] || "",
    info["Druh"] || "",
    before.category,
    before.subcategory,
  );

  if (!mapped) continue;
  if (
    mapped.category === before.category &&
    mapped.subcategory === before.subcategory
  ) {
    continue;
  }

  writeInfo(dir, {
    name: info["Názov"],
    description: info["Popis"],
    farby: info["Farby"] ?? "",
    druh: info["Druh"],
    category: mapped.category,
    subcategory: mapped.subcategory,
    sourceFolder: info["Zdrojová zložka"],
  });

  changes.push({
    id: ent.name,
    name: info["Názov"],
    from: `${before.category} / ${before.subcategory || "(bez sub)"}`,
    to: `${mapped.category} / ${mapped.subcategory || "(bez sub)"}`,
  });
}

// summary by target
const byTarget = new Map();
for (const c of changes) {
  if (!byTarget.has(c.to)) byTarget.set(c.to, []);
  byTarget.get(c.to).push(c.id);
}

console.log(
  JSON.stringify(
    {
      changed: changes.length,
      skippedHotovo: skipped,
      byTarget: Object.fromEntries(
        [...byTarget.entries()].map(([k, v]) => [k, v.length]),
      ),
    },
    null,
    2,
  ),
);

fs.writeFileSync(
  path.join("scripts/katalog-5-9-26/v4-reports", "remap-taxonomy.json"),
  JSON.stringify({ skipped, changes }, null, 2),
);
fs.mkdirSync(path.join(ROOT, "_reports"), { recursive: true });
fs.copyFileSync(
  path.join("scripts/katalog-5-9-26/v4-reports", "remap-taxonomy.json"),
  path.join(ROOT, "_reports", "remap-taxonomy.json"),
);
