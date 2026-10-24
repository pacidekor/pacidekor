// Local-only regression/benchmark: no network requests or database writes.
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
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


const { getSetSize, salesUnitLabel, salesOrderName, salesQuantityLabel } = load("src/lib/sales-unit.ts");
const { getProductOrderMultiple, getPrimaryPackagingOption, formatPackagingDeliveryHint, snapQuantityToMultiple } = load("src/lib/taxonomy.ts");
const { mapProductRow } = load("src/lib/products.ts");
const { audienceNetPrice } = load("src/lib/price.ts");
const legacy = [{id:"vlastni",label:"Balenie",pieces:3}];
const set = [{id:"sada",pieces:3}];
assert.equal(salesUnitLabel(legacy),"ks");
assert.equal(getProductOrderMultiple(legacy),3);
assert.equal(snapQuantityToMultiple(1,getProductOrderMultiple(legacy)),3);
assert.equal(Math.round(audienceNetPrice(13.90,false)*3*100),6255);
assert.equal(salesUnitLabel(set),"sada");
assert.equal(getProductOrderMultiple(set),1);
assert.equal(snapQuantityToMultiple(1,getProductOrderMultiple(set)),1);
assert.equal(Math.round(audienceNetPrice(13.90,false)*100),2085);
assert.equal(Math.round(audienceNetPrice(13.90,false)*2*100),4170);
assert.equal(Math.round(audienceNetPrice(13.90,true)*2*100),2780);
assert.equal(formatPackagingDeliveryHint(getPrimaryPackagingOption(set)),"Sada obsahuje 3 ks");
assert.equal(getProductOrderMultiple([...set,{id:"krabica",pieces:4}]),4);
assert.equal(salesOrderName("Lodicky",set),"Lodicky (sada 3 ks)");
assert.equal(salesOrderName("Lodicky",legacy),"Lodicky");
assert.equal(salesQuantityLabel(1,set),"1 sada");
assert.equal(salesQuantityLabel(2,set),"2 sady");
assert.equal(salesQuantityLabel(5,set),"5 sád");
assert.equal(getSetSize([{id:"sada",pieces:0}]),null);
assert.equal(getSetSize([{id:"sada",pieces:3.5}]),null);
assert.equal(getProductOrderMultiple(undefined),1);
const row = {id:"x",slug:"x",name:"Lodicky",price:"13,90 €",category:"Košíky",images:[],color_ids:[],packaging:set};
assert.deepEqual(mapProductRow(row).attributes.packaging,[{id:"sada",pieces:3,label:undefined}]);
console.log("PASS: 21 assertions covering legacy packs, complete sets, retail/wholesale totals, bulk sets, order snapshots and product mapping. No network or database writes.");
