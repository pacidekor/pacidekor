// Run: node --experimental-strip-types --test src/lib/order-line-color.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  firstOrderableColorId,
  isCartLineColorValid,
  isColorOrderable,
  isProductOrderableByColors,
  migrateUnavailableColorIds,
  validateOrderLineColor,
} from "./order-line-color.ts";

const MIX = "custom:9a9a96:Mix";
const COLORS_AFTER_MIX_REMOVED = [
  "ruzova",
  "kremova",
  "custom:9a9a96:Lososov%C3%A1",
];

test("removed Mix is rejected against current color_ids (no silent remap)", () => {
  const r = validateOrderLineColor("Drobnokvet", COLORS_AFTER_MIX_REMOVED, MIX);
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.equal(r.code, "color_invalid");
  assert.match(r.message, /už nie je v ponuke/i);
});

test("valid remaining color is accepted", () => {
  const r = validateOrderLineColor(
    "Drobnokvet",
    COLORS_AFTER_MIX_REMOVED,
    "kremova",
  );
  assert.equal(r.ok, true);
});

test("product with colors requires a selection", () => {
  const r = validateOrderLineColor("Drobnokvet", COLORS_AFTER_MIX_REMOVED, "");
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.equal(r.code, "color_required");
});

test("product without color variants accepts empty colorId", () => {
  assert.equal(validateOrderLineColor("Bez farieb", [], undefined).ok, true);
  assert.equal(validateOrderLineColor("Bez farieb", null, "").ok, true);
  assert.equal(validateOrderLineColor("Bez farieb", undefined, null).ok, true);
});

test("product without color variants rejects a leftover Mix/colorId", () => {
  const r = validateOrderLineColor("Bez farieb", [], MIX);
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.equal(r.code, "color_not_allowed");
});

test("isCartLineColorValid mirrors validate for storefront color options", () => {
  const options = COLORS_AFTER_MIX_REMOVED.map((id) => ({ id }));
  assert.equal(isCartLineColorValid(options, MIX), false);
  assert.equal(isCartLineColorValid(options, "ruzova"), true);
  assert.equal(isCartLineColorValid([], undefined), true);
  assert.equal(isCartLineColorValid([], MIX), false);
});

test("one unavailable color is rejected; other colors still ok", () => {
  const unavailable = ["ruzova"];
  const blocked = validateOrderLineColor(
    "Hortenzia",
    ["biela", "ruzova", "zelena"],
    "ruzova",
    unavailable,
  );
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.equal(blocked.code, "color_unavailable");

  const ok = validateOrderLineColor(
    "Hortenzia",
    ["biela", "ruzova", "zelena"],
    "biela",
    unavailable,
  );
  assert.equal(ok.ok, true);
  assert.equal(isColorOrderable("biela", ["biela", "ruzova"], unavailable), true);
  assert.equal(isColorOrderable("ruzova", ["biela", "ruzova"], unavailable), false);
});

test("all colors unavailable → product not orderable; empty unavailable keeps legacy", () => {
  assert.equal(
    isProductOrderableByColors({
      productInStock: true,
      colorIds: ["biela", "ruzova"],
      unavailableColorIds: ["biela", "ruzova"],
    }),
    false,
  );
  assert.equal(
    isProductOrderableByColors({
      productInStock: true,
      colorIds: ["biela", "ruzova"],
      unavailableColorIds: [],
    }),
    true,
  );
  assert.equal(
    isProductOrderableByColors({
      productInStock: true,
      colorIds: [],
      unavailableColorIds: ["biela"],
    }),
    true,
  );
});

test("product-level OOS overrides color availability", () => {
  assert.equal(
    isProductOrderableByColors({
      productInStock: false,
      colorIds: ["biela"],
      unavailableColorIds: [],
    }),
    false,
  );
});

test("product without colors follows productInStock only", () => {
  assert.equal(
    isProductOrderableByColors({
      productInStock: true,
      colorIds: null,
      unavailableColorIds: [],
    }),
    true,
  );
  assert.equal(
    isProductOrderableByColors({
      productInStock: false,
      colorIds: undefined,
    }),
    false,
  );
});

test("firstOrderableColorId skips unavailable", () => {
  assert.equal(
    firstOrderableColorId(["ruzova", "biela"], ["ruzova"]),
    "biela",
  );
  assert.equal(firstOrderableColorId(["ruzova"], ["ruzova"]), "");
});

test("cart line with unavailable color requires explicit reselect", () => {
  const options = ["biela", "ruzova"].map((id) => ({ id }));
  assert.equal(isCartLineColorValid(options, "ruzova", ["ruzova"]), false);
  assert.equal(isCartLineColorValid(options, "biela", ["ruzova"]), true);
});

test("rename migration remaps unavailable flag; removed color drops flag", () => {
  const migration = new Map([
    ["custom:aaa:Stara", "custom:bbb:Nova"],
  ]);
  assert.deepEqual(
    migrateUnavailableColorIds({
      unavailableColorIds: ["custom:aaa:Stara", "ruzova", "gone"],
      colorIds: ["custom:bbb:Nova", "biela"],
      migration,
    }),
    ["custom:bbb:Nova"],
  );
});

test("empty unavailable_color_ids preserves prior membership behaviour", () => {
  const r = validateOrderLineColor("X", ["biela"], "biela", []);
  assert.equal(r.ok, true);
  assert.equal(isCartLineColorValid([{ id: "biela" }], "biela", undefined), true);
});
