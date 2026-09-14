/**
 * Assign Aranž. materiál products to subcategories (Stuhy-style).
 * Skip *hotovo folders (already sorted manually).
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

/** id -> subcategory under Aranž. materiál */
const SUB_BY_ID = {
  160: "Ampulky na vodu",
  161: "Ampulky na vodu",
  163: "Ampulky na vodu",
  148: "Floristický drôt",
  159: "Plastové stonky",
  167: "Umelé lýko",
  172: "Papierové lyko", // if still present and not hotovo
  168: "Špagáty a šnúry",
  170: "Špagáty a šnúry",
  171: "Špagáty a šnúry",
  147: "Spreje",
  124: "Vlákna",
  126: "Vlákna",
  110: "Vrecúška",
};

const changes = [];
const skipped = [];
const unresolved = [];

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
  if (info["Kategória"] !== "Aranž. materiál") continue;

  const sub = SUB_BY_ID[ent.name];
  if (!sub) {
    unresolved.push({
      id: ent.name,
      name: info["Názov"],
      druh: info["Druh"],
    });
    continue;
  }

  const before = info["Subkategória"] || "";
  writeInfo(dir, {
    name: info["Názov"],
    description: info["Popis"],
    farby: info["Farby"] ?? "",
    druh: info["Druh"],
    category: "Aranž. materiál",
    subcategory: sub,
    sourceFolder: info["Zdrojová zložka"],
  });

  changes.push({
    id: ent.name,
    name: info["Názov"],
    from: before || "(bez sub)",
    to: sub,
  });
}

console.log(
  JSON.stringify({ changed: changes.length, changes, skipped, unresolved }, null, 2),
);

fs.mkdirSync("scripts/katalog-5-9-26/v4-reports", { recursive: true });
fs.writeFileSync(
  "scripts/katalog-5-9-26/v4-reports/aranz-subkategorie.json",
  JSON.stringify({ changes, skipped, unresolved }, null, 2),
);
