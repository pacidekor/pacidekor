// Run: node --experimental-strip-types --test src/lib/order-line-color.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  isCartLineColorValid,
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
