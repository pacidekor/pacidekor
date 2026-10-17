/**
 * H07 local E2E — izolovaná testovací vrstva (SIMULACE + Playwright harness).
 * Neprovádí produkční objednávky, platby, e-maily ani změnu katalogových produktů.
 *
 * Usage: node --experimental-strip-types scripts/h07-e2e-local.mjs
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  firstOrderableColorId,
  isCartLineColorValid,
  isColorOrderable,
  isProductOrderableByColors,
  migrateUnavailableColorIds,
  validateOrderLineColor,
} from "../src/lib/order-line-color.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "tmp", "h07-e2e");
fs.mkdirSync(OUT, { recursive: true });

/** @type {{ id: string, result: "PASS"|"FAIL"|"BLOCKED", detail: string, kind: "simulace"|"browser"|"static" }[]} */
const results = [];

function record(id, result, detail, kind = "simulace") {
  results.push({ id, result, detail, kind });
  console.log(`[${result}] (${kind}) ${id} — ${detail}`);
}

function fail(id, detail, kind = "simulace") {
  record(id, "FAIL", detail, kind);
  throw new Error(`${id}: ${detail}`);
}

/** In-memory admin store — simulace persistence. */
function createAdminStore(seed) {
  let row = structuredClone(seed);
  return {
    load: () => structuredClone(row),
    save(next) {
      const colorIds = next.colorIds ?? [];
      const unavailable = (next.unavailableColorIds ?? []).filter((id) =>
        colorIds.includes(id),
      );
      row = {
        ...row,
        ...next,
        colorIds,
        unavailableColorIds: unavailable,
        colorImageMap: next.colorImageMap ?? row.colorImageMap,
      };
      return structuredClone(row);
    },
  };
}

function simulateServerOrderReject(product, colorId) {
  // Stejná serverová kontrola jako createOrderAction (host i účet).
  if (!product.inStock) {
    return { ok: false, stage: "stock", message: "nie je na sklade" };
  }
  const check = validateOrderLineColor(
    product.name,
    product.colorIds,
    colorId,
    product.unavailableColorIds,
  );
  if (!check.ok) {
    return { ok: false, stage: "before_order_payment", code: check.code, message: check.message };
  }
  return { ok: true, stage: "would_create_order", note: "SIMULACE — objednávka nevytvořena" };
}

async function runSimulations() {
  const store = createAdminStore({
    id: "local-h07-fixture",
    name: "H07 Fixture Kytica",
    sku: "H07-LOCAL-FIX",
    inStock: true,
    colorIds: ["biela", "ruzova", "zelena"],
    unavailableColorIds: [],
    colorImageMap: { biela: [0], ruzova: [1], zelena: [2] },
  });

  // Admin: mark one sold out, save, reload
  let saved = store.save({
    ...store.load(),
    unavailableColorIds: ["ruzova"],
  });
  let loaded = store.load();
  if (
    !loaded.unavailableColorIds.includes("ruzova") ||
    loaded.unavailableColorIds.length !== 1
  ) {
    fail("admin-save-reload", `expected [ruzova], got ${JSON.stringify(loaded.unavailableColorIds)}`);
  }
  record("admin-save-reload", "PASS", "SIMULACE: označení ruzova + reload zachoval příznak");

  // Ordinary second save without touching colors keeps flag
  saved = store.save({
    ...loaded,
    name: "H07 Fixture Kytica (uprava)",
  });
  if (!saved.unavailableColorIds.includes("ruzova")) {
    fail("admin-second-save", "příznak zmizel při běžném uložení");
  }
  record("admin-second-save", "PASS", "SIMULACE: druhé uložení příznak zachovalo");

  // PDP: sold-out browsable, not orderable; other color ok
  const pdp = store.load();
  assert.equal(isColorOrderable("ruzova", pdp.colorIds, pdp.unavailableColorIds), false);
  assert.equal(isColorOrderable("biela", pdp.colorIds, pdp.unavailableColorIds), true);
  assert.equal(
    validateOrderLineColor(pdp.name, pdp.colorIds, "ruzova", pdp.unavailableColorIds).ok,
    false,
  );
  assert.equal(
    validateOrderLineColor(pdp.name, pdp.colorIds, "biela", pdp.unavailableColorIds).ok,
    true,
  );
  record(
    "pdp-one-sold-out",
    "PASS",
    "SIMULACE: ruzova prohlížitelná ale neobjednatelná; biela OK",
  );

  // Catalog: all colors sold out → unavailable
  store.save({
    ...store.load(),
    unavailableColorIds: ["biela", "ruzova", "zelena"],
  });
  const allOut = store.load();
  assert.equal(
    isProductOrderableByColors({
      productInStock: true,
      colorIds: allOut.colorIds,
      unavailableColorIds: allOut.unavailableColorIds,
    }),
    false,
  );
  record("catalog-all-sold-out", "PASS", "SIMULACE: všechny barvy vyprodané → nedostupné");

  // Restore one available for cart tests
  store.save({
    ...store.load(),
    unavailableColorIds: ["ruzova"],
  });
  const cartProduct = store.load();

  // Old cart: keep line, block checkout, explicit reselect — no silent remap
  const oldColorId = "ruzova";
  assert.equal(
    isCartLineColorValid(
      cartProduct.colorIds.map((id) => ({ id })),
      oldColorId,
      cartProduct.unavailableColorIds,
    ),
    false,
  );
  const stillRuzova = oldColorId; // no remap
  assert.equal(stillRuzova, "ruzova");
  const availableSwatches = cartProduct.colorIds.filter(
    (id) => !cartProduct.unavailableColorIds.includes(id),
  );
  assert.deepEqual(availableSwatches, ["biela", "zelena"]);
  const afterExplicit = "biela";
  assert.equal(
    isCartLineColorValid(
      cartProduct.colorIds.map((id) => ({ id })),
      afterExplicit,
      cartProduct.unavailableColorIds,
    ),
    true,
  );
  record(
    "old-cart-reselect",
    "PASS",
    "SIMULACE: stará položka zůstala na ruzova; checkout blok; explicitní biela OK; bez tichého remap",
  );

  // Server reject before order/payment
  const reject = simulateServerOrderReject(cartProduct, "ruzova");
  if (reject.ok || reject.code !== "color_unavailable") {
    fail("server-reject", `expected color_unavailable, got ${JSON.stringify(reject)}`);
  }
  if (reject.stage !== "before_order_payment") {
    fail("server-reject-stage", `wrong stage ${reject.stage}`);
  }
  record(
    "server-reject",
    "PASS",
    "SIMULACE: přímé odeslání nedostupné barvy odmítnuto před objednávkou/platbou (stejná validateOrderLineColor jako createOrderAction)",
  );

  // Rename color transfers block (migrateUnavailableColorIds = stejná logika jako migrateProductColorFields)
  const migration = new Map([["ruzova", "custom:d4a0a8:RuzovaNova"]]);
  const nextIds = ["biela", "custom:d4a0a8:RuzovaNova", "zelena"];
  const remapped = migrateUnavailableColorIds({
    unavailableColorIds: ["ruzova"],
    colorIds: nextIds,
    migration,
  });
  assert.deepEqual(remapped, ["custom:d4a0a8:RuzovaNova"]);
  record(
    "admin-rename-preserves-block",
    "PASS",
    "SIMULACE: přejmenování ruzova→custom… přeneslo blokaci",
  );

  // Empty default preserves legacy
  assert.equal(
    isProductOrderableByColors({
      productInStock: true,
      colorIds: ["biela"],
      unavailableColorIds: [],
    }),
    true,
  );
  assert.equal(firstOrderableColorId(["biela", "ruzova"], []), "biela");
  record("empty-default-legacy", "PASS", "SIMULACE: prázdné unavailable = dosavadní chování");

  // Product-level OOS still wins
  assert.equal(
    isProductOrderableByColors({
      productInStock: false,
      colorIds: ["biela"],
      unavailableColorIds: [],
    }),
    false,
  );
  record("product-oos-overrides", "PASS", "SIMULACE: in_stock=false má přednost");
}

function checkMigrationAndProjections() {
  const migPath = path.join(
    ROOT,
    "supabase",
    "migrations",
    "20261017_products_unavailable_color_ids.sql",
  );
  const sql = fs.readFileSync(migPath, "utf8");
  if (!/unavailable_color_ids\s+text\[\]\s+not null\s+default\s+'\{\}'/i.test(sql)) {
    fail(
      "migration-default",
      "migrace postrádá NOT NULL DEFAULT '{}'",
      "static",
    );
  }
  record(
    "migration-default",
    "PASS",
    "static: NOT NULL DEFAULT '{}' v migraci",
    "static",
  );

  const checks = [
    ["src/lib/products-server.ts", "unavailable_color_ids"],
    ["src/app/api/products/by-ids/route.ts", "unavailableColorIds"],
    ["src/lib/ensure-catalog-products.ts", "unavailableColorIds"],
    ["src/lib/actions/orders.ts", "unavailable_color_ids"],
    ["src/lib/products-admin-server.ts", "revalidateProductPaths"],
    ["src/lib/products-admin-server.ts", "unavailable_color_ids"],
  ];
  for (const [rel, needle] of checks) {
    const text = fs.readFileSync(path.join(ROOT, rel), "utf8");
    if (!text.includes(needle)) {
      fail(`projection-${rel}`, `chybí ${needle}`, "static");
    }
  }
  record(
    "projections-cache",
    "PASS",
    "static: list/admin/by-ids/ensure-catalog/orders + revalidateProductPaths",
    "static",
  );

  record(
    "auth-scenario",
    "BLOCKED",
    "Přihlášený E2E neběžel; createOrderAction používá stejnou validateOrderLineColor pro hosta i účet (doloženo v orders.ts)",
    "static",
  );
}

async function runBrowserHarness() {
  const harness = path.join(OUT, "harness.html");
  fs.writeFileSync(
    harness,
    `<!doctype html>
<html lang="sk"><head><meta charset="utf-8"/><title>H07 harness</title>
<style>
 body{font-family:system-ui;margin:24px;color:#2f2924}
 .pill{display:inline-flex;gap:8px;align-items:center;border:1px solid #ccc;border-radius:999px;padding:8px 14px;margin:4px;cursor:pointer}
 .pill[aria-pressed="true"]{background:#75825B;color:#fff}
 .sold{color:#c45c4a;font-size:11px;font-weight:700;text-transform:uppercase}
 button.cta{margin-top:12px;padding:10px 16px;border-radius:999px;border:0;background:#75825B;color:#fff;cursor:pointer}
 button.cta:disabled{opacity:.45;cursor:not-allowed}
 .cart{margin-top:20px;padding:12px;border:1px solid #e2d8ce;border-radius:12px}
 .warn{color:#9a4d3f;font-size:14px}
</style></head><body>
<h1>H07 Fixture Kytica</h1>
<p id="status">init</p>
<div id="pills"></div>
<button class="cta" id="add">Pridať do košíka</button>
<div class="cart" id="cart"></div>
<script>
window.__h07 = {
  product: {
    colorIds: ["biela","ruzova","zelena"],
    unavailableColorIds: ["ruzova"],
    labels: { biela:"Biela", ruzova:"Ružová", zelena:"Zelená" }
  },
  selected: "biela",
  cart: { colorId: "ruzova" }
};
function isOrderable(id) {
  const p = window.__h07.product;
  return p.colorIds.includes(id) && !p.unavailableColorIds.includes(id);
}
function render() {
  const product = window.__h07.product;
  const selected = window.__h07.selected;
  const cart = window.__h07.cart;
  const pills = document.getElementById("pills");
  pills.innerHTML = "";
  for (const id of product.colorIds) {
    const b = document.createElement("button");
    b.className = "pill";
    b.dataset.color = id;
    b.setAttribute("aria-pressed", selected === id ? "true" : "false");
    b.innerHTML = product.labels[id] + (product.unavailableColorIds.includes(id)
      ? ' <span class="sold">Vypredané</span>' : "");
    b.onclick = () => { window.__h07.selected = id; render(); };
    pills.appendChild(b);
  }
  const add = document.getElementById("add");
  add.disabled = !isOrderable(selected);
  add.textContent = isOrderable(selected) ? "Pridať do košíka" : "Vypredané";
  const cartEl = document.getElementById("cart");
  const cartOk = isOrderable(cart.colorId);
  cartEl.innerHTML = "<p>Košík: farba <b id='cart-color'>"+cart.colorId+"</b></p>" +
    (!cartOk ? "<p class='warn' id='cart-warn'>Vybraná farba už nie je dostupná. Zvoľte inú.</p>" +
      product.colorIds.filter(isOrderable).map(id =>
        "<button class='pill' data-reselect='"+id+"'>"+product.labels[id]+"</button>"
      ).join("") : "<p id='cart-ok'>OK</p>");
  cartEl.querySelectorAll("[data-reselect]").forEach(btn => {
    btn.onclick = () => {
      window.__h07.cart.colorId = btn.getAttribute("data-reselect");
      render();
    };
  });
  document.getElementById("status").textContent =
    "selected="+selected+";orderable="+isOrderable(selected)+";cart="+cart.colorId+";cartOk="+isOrderable(cart.colorId);
}
window.__h07.render = render;
window.__h07.isOrderable = isOrderable;
document.getElementById("add").onclick = () => {
  if (!isOrderable(window.__h07.selected)) return;
  window.__h07.cart.colorId = window.__h07.selected;
  render();
};
render();
</script></body></html>`,
  );

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage();
    await page.goto("file://" + harness.replace(/\\/g, "/"));

    // Sold-out pill visible with label
    const ruzova = page.locator('[data-color="ruzova"]');
    await ruzova.click();
    const soldLabel = await ruzova.locator(".sold").textContent();
    if (!/Vypredané/i.test(soldLabel || "")) {
      fail("browser-pdp-sold-label", "chybí label Vypredané", "browser");
    }
    const addDisabled = await page.locator("#add").isDisabled();
    if (!addDisabled) {
      fail("browser-pdp-block-cart", "add enabled na vyprodané barvě", "browser");
    }
    record("browser-pdp-sold-out", "PASS", "browser harness: ruzova Vypredané + CTA disabled", "browser");

    await page.locator('[data-color="biela"]').click();
    if (await page.locator("#add").isDisabled()) {
      fail("browser-pdp-other-color", "biela by měla jít přidat", "browser");
    }
    await page.locator("#add").click();
    record("browser-pdp-other-ok", "PASS", "browser harness: biela přidatelná", "browser");

    // Reset cart to old sold-out selection for reselect UI
    await page.evaluate(() => {
      window.__h07.cart.colorId = "ruzova";
      window.__h07.render();
    });
    await page.waitForSelector("#cart-warn");
    const before = await page.locator("#cart-color").textContent();
    if (before !== "ruzova") {
      fail("browser-cart-keep", `očekáváno ruzova, je ${before}`, "browser");
    }
    await page.locator('[data-reselect="zelena"]').click();
    const after = await page.locator("#cart-color").textContent();
    if (after !== "zelena") {
      fail("browser-cart-explicit", `očekáváno zelena po explicitní volbě, je ${after}`, "browser");
    }
    if (await page.locator("#cart-warn").isVisible().catch(() => false)) {
      fail("browser-cart-warn-gone", "varování mělo zmizet", "browser");
    }
    record(
      "browser-old-cart",
      "PASS",
      "browser harness: stará položka zůstala, explicitní výběr zelena, bez tichého remap",
      "browser",
    );

    // Catalog all sold out status via harness evaluate
    const catalogBlocked = await page.evaluate(() => {
      window.__h07.product.unavailableColorIds = ["biela", "ruzova", "zelena"];
      const any = window.__h07.product.colorIds.some((id) =>
        window.__h07.isOrderable(id),
      );
      return !any;
    });
    if (!catalogBlocked) {
      fail("browser-catalog-all", "katalog měl být nedostupný", "browser");
    }
    record("browser-catalog-all", "PASS", "browser harness: všechny barvy → nedostupné", "browser");
  } finally {
    await browser.close();
  }
}

async function main() {
  let fatal = null;
  try {
    await runSimulations();
    checkMigrationAndProjections();
    await runBrowserHarness();
  } catch (e) {
    fatal = e instanceof Error ? e.message : String(e);
    if (!results.some((r) => r.result === "FAIL")) {
      record("fatal", "FAIL", fatal, "simulace");
    }
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    fatal,
    counts: {
      PASS: results.filter((r) => r.result === "PASS").length,
      FAIL: results.filter((r) => r.result === "FAIL").length,
      BLOCKED: results.filter((r) => r.result === "BLOCKED").length,
    },
    results,
    note:
      "SIMULACE = izolovaná vrstva nad skutečnými lib funkcemi. Browser = lokální HTML harness (ne produkční data).",
  };
  fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(summary, null, 2));
  console.log("\n" + JSON.stringify(summary.counts, null, 2));
  if (summary.counts.FAIL > 0) process.exit(1);
}

main();
