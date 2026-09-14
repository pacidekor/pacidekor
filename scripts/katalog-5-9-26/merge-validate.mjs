/**
 * Merge catalog chunks, validate photo IDs against inventory, write catalog.json
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(".");
const DIR = path.join(ROOT, "scripts/katalog-5-9-26");
const INV = JSON.parse(
  fs.readFileSync(path.join(DIR, "inventory.json"), "utf8"),
);

const chunks = [
  "catalog-chunk-01-04.json",
  "catalog-chunk-05-20.json",
  "catalog-chunk-21-40.json",
  "catalog-chunk-41-80.json",
  "catalog-chunk-81-120.json",
  "catalog-chunk-121-178.json",
];

const invByFolder = Object.fromEntries(
  INV.map((x) => [String(x.folder), x]),
);

const EM = /[\u2013\u2014\u2015]/;
const products = [];
const errors = [];
const warnings = [];

for (const file of chunks) {
  const full = path.join(DIR, file);
  if (!fs.existsSync(full)) {
    errors.push(`missing chunk ${file}`);
    continue;
  }
  const arr = JSON.parse(fs.readFileSync(full, "utf8"));
  if (!Array.isArray(arr)) {
    errors.push(`${file} is not array`);
    continue;
  }
  for (const p of arr) {
    products.push(p);
  }
}

products.sort(
  (a, b) => Number(a.sourceFolder) - Number(b.sourceFolder),
);

const covered = new Set(products.map((p) => String(p.sourceFolder)));
for (const item of INV) {
  if (!covered.has(String(item.folder))) {
    warnings.push(`no catalog entry for folder ${item.folder}`);
  }
}

for (const p of products) {
  const inv = invByFolder[String(p.sourceFolder)];
  if (!inv) {
    errors.push(`unknown sourceFolder ${p.sourceFolder}`);
    continue;
  }
  const ids = new Set(inv.files.map((f) => String(f.id)));

  if (!p.name?.trim()) errors.push(`${p.sourceFolder}: empty name`);
  if (!p.description?.trim()) errors.push(`${p.sourceFolder}: empty description`);
  if (EM.test(p.name || "") || EM.test(p.description || "")) {
    errors.push(`${p.sourceFolder}: em dash in name/description`);
  }
  if (!Array.isArray(p.groups) || p.groups.length === 0) {
    errors.push(`${p.sourceFolder}: empty groups`);
    continue;
  }

  const used = new Set();
  for (const g of p.groups) {
    if (!g.color?.trim()) {
      errors.push(`${p.sourceFolder}: empty color`);
    }
    if (!Array.isArray(g.photos) || g.photos.length === 0) {
      errors.push(`${p.sourceFolder}: empty photos for ${g.color}`);
      continue;
    }
    for (const ph of g.photos) {
      const id = String(ph);
      if (!ids.has(id)) {
        errors.push(`${p.sourceFolder}: photo id ${id} not in inventory`);
      }
      if (used.has(id)) {
        warnings.push(`${p.sourceFolder}: duplicate photo ${id}`);
      }
      used.add(id);
    }
  }
}

const taxonomy = {
  categories: [...new Set(products.map((p) => p.category).filter(Boolean))],
  subcategories: [
    ...new Set(
      products.map((p) => `${p.category} > ${p.subcategory}`).filter(Boolean),
    ),
  ].sort(),
  druhy: [...new Set(products.map((p) => p.druh).filter(Boolean))].sort(),
};

fs.writeFileSync(
  path.join(DIR, "catalog.json"),
  JSON.stringify(products, null, 2),
  "utf8",
);
fs.writeFileSync(
  path.join(DIR, "taxonomy-new.json"),
  JSON.stringify(taxonomy, null, 2),
  "utf8",
);
fs.writeFileSync(
  path.join(DIR, "validate-report.json"),
  JSON.stringify({ errors, warnings, count: products.length }, null, 2),
  "utf8",
);

console.log("products", products.length);
console.log("errors", errors.length);
console.log("warnings", warnings.length);
if (errors.length) {
  console.log(errors.slice(0, 40).join("\n"));
  process.exitCode = 1;
}
if (warnings.length) {
  console.log("--- warnings ---");
  console.log(warnings.slice(0, 40).join("\n"));
}
