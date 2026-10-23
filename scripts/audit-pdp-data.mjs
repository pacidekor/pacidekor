// Local-only regression/benchmark: no network requests or database writes.
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { performance } from "node:perf_hooks";
import ts from "typescript";

const root = process.cwd();
const modules = new Map();
const requirePackage = createRequire(import.meta.url);
function load(file) {
  file = path.resolve(file);
  if (modules.has(file)) return modules.get(file).exports;
  const loadedModule = { exports: {} };
  modules.set(file, loadedModule);
  const code = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const localRequire = (id) => {
    if (!id.startsWith("@/") && !id.startsWith(".")) return requirePackage(id);
    const base = id.startsWith("@/")
      ? path.join(root, "src", id.slice(2))
      : path.resolve(path.dirname(file), id);
    return load(existsSync(base) ? base : `${base}.ts`);
  };
  new Function("exports", "require", "module", "process", code)(
    loadedModule.exports, localRequire, loadedModule, process,
  );
  return loadedModule.exports;
}

const { mapProductRow, getRelatedProducts } = load("src/lib/products.ts");
const rows = Array.from({ length: 24 }, (_, i) => ({
  id: `id-${i}`, slug: `p-${i}`, name: `Product ${i}`, category: "Keramika",
  price: "13,90 €", in_stock: i % 2 === 0, stock_quantity: null,
  color_ids: ["biela", "zelena", "ruzova"], unavailable_color_ids: ["zelena"],
  color_stock: { biela: 3, zelena: 0 }, packaging: [{ id: "krabica", pieces: 2 }],
  images: Array.from({ length: 12 }, (_, j) => `https://example.org/${i}-${j}.webp`),
  color_image_map: { biela: [0, 1], zelena: [2, 3], ruzova: [4, 5] },
}));
const before = (slug, count) => getRelatedProducts(rows.map(mapProductRow), slug, count);
const after = (slug, count) => getRelatedProducts(rows, slug, count).map(mapProductRow);
for (const slug of ["p-0", "p-8", "p-23", "absent"]) {
  for (const count of [0, 1, 4, 30]) assert.deepEqual(after(slug, count), before(slug, count));
}

// Exercise the actual invalidation helper with captured Next callbacks.
const adminSource = ts.createSourceFile("admin.ts", readFileSync("src/lib/products-admin-server.ts", "utf8"), ts.ScriptTarget.Latest, true);
const helper = adminSource.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "revalidateProductPaths");
assert.ok(helper);
const helperCode = ts.transpileModule(helper.getText(adminSource), {
  compilerOptions: { target: ts.ScriptTarget.ES2020 },
}).outputText;
const paths = [], tags = [];
new Function("revalidatePath", "revalidateTag", `${helperCode}; revalidateProductPaths({slug: 'new', previousSlug: 'old'});`)(
  (...args) => paths.push(args), (...args) => tags.push(args),
);
assert.ok(paths.some((args) => args[0] === "/" && args.length === 1));
assert.ok(!paths.some((args) => args[0] === "/" && args[1] === "layout"));
for (const target of ["/produkt/new", "/produkt/old", "/produkty", "/novinky", "/akcia", "/vypredaj", "/bestsellery", "/kategorie", "/produkt"]) {
  assert.ok(paths.some(([p]) => p === target), `Missing invalidation: ${target}`);
}
assert.deepEqual(tags, [["storefront-catalog", "max"]]);

function measure(fn) {
  for (let i = 0; i < 100; i++) fn("p-8", 4);
  const samples = [];
  for (let round = 0; round < 7; round++) {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) fn("p-8", 4);
    samples.push((performance.now() - start) / 1000);
  }
  return samples.sort((a, b) => a - b)[3];
}
console.log(JSON.stringify({
  regression: "PASS: identical real product mapping in 16 scenarios",
  invalidation: "PASS: home page, catalog, PDP and old/new slugs retained; root layout preserved",
  rowsNormalizedBefore: 24, rowsNormalizedAfter: 4,
  localMedianMsPerSelection: { before: measure(before), after: measure(after) },
  note: "Synthetic local data, not production Worker CPU or full-page latency.",
}, null, 2));
