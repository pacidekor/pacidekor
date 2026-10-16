// Run: node --experimental-strip-types --test src/lib/product-gallery-order.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { orderProductGallery } from "./product-gallery-order.ts";

const imgs = (n) => Array.from({ length: n }, (_, i) => `u${i}`);

// SPRING-like: [0] shared; silver 1, yellow 2, gold 3, white 4, red 5
const spring = {
  images: imgs(7),
  colorIds: ["silver", "yellow", "gold", "white", "red"],
  colorImageMap: { silver: [1], yellow: [2], gold: [3], white: [4], red: [5] },
  sharedImageUrls: ["u0"],
};

test("selected color first, other colors in color order, shared + general last", () => {
  const r = orderProductGallery(spring, "silver");
  assert.equal(r.mode, "variant-first");
  assert.deepEqual(r.indexes, [1, 2, 3, 4, 5, 6, 0]);
});

test("shared photos are always the very last, after general ones, for every color", () => {
  for (const c of spring.colorIds) {
    assert.equal(orderProductGallery(spring, c).indexes.at(-1), 0);
  }
  const r = orderProductGallery(
    { images: imgs(5), colorIds: ["a", "b"], colorImageMap: { a: [0], b: [1] }, sharedImageUrls: ["u2", "u3"] },
    "b",
  );
  assert.deepEqual(r.indexes, [1, 0, 4, 2, 3]);
});

test("changing color re-sorts by the same rule", () => {
  assert.deepEqual(orderProductGallery(spring, "gold").indexes, [3, 1, 2, 4, 5, 6, 0]);
  assert.deepEqual(orderProductGallery(spring, "red").indexes, [5, 1, 2, 3, 4, 6, 0]);
});

test("every photo exactly once", () => {
  for (const c of spring.colorIds) {
    const { indexes } = orderProductGallery(spring, c);
    assert.deepEqual([...indexes].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6]);
  }
});

test("multiple photos of one color keep their mapped order", () => {
  const r = orderProductGallery(
    { images: imgs(5), colorIds: ["a", "b"], colorImageMap: { a: [2, 0], b: [1, 3] }, sharedImageUrls: [] },
    "a",
  );
  assert.deepEqual(r.indexes, [2, 0, 1, 3, 4]);
});

test("photo mapped to two colors but marked shared moves to the end", () => {
  const r = orderProductGallery(
    { images: imgs(3), colorIds: ["a", "b"], colorImageMap: { a: [0, 1], b: [2, 1] }, sharedImageUrls: ["u1"] },
    "a",
  );
  assert.deepEqual(r.indexes, [0, 2, 1]);
  assert.deepEqual(r.ambiguousIndexes, []);
});

test("photo mapped to two colors and NOT marked shared is reported as ambiguous", () => {
  const r = orderProductGallery(
    { images: imgs(3), colorIds: ["a", "b"], colorImageMap: { a: [0, 1], b: [2, 1] }, sharedImageUrls: [] },
    "b",
  );
  assert.equal(r.mode, "variant-first");
  assert.deepEqual(r.ambiguousIndexes, [1]);
  assert.deepEqual(r.indexes, [2, 1, 0]);
});

test("only shared photos (no individual) – all at the end in index order, nothing lost", () => {
  const r = orderProductGallery(
    { images: imgs(3), colorIds: ["a"], colorImageMap: { a: [0] }, sharedImageUrls: ["u0", "u1", "u2"] },
    "a",
  );
  assert.deepEqual(r.indexes, [0, 1, 2]);
});

test("same URL stored twice is shown once", () => {
  const r = orderProductGallery(
    { images: ["x", "y", "x"], colorIds: ["a", "b"], colorImageMap: { a: [0], b: [1] }, sharedImageUrls: [] },
    "b",
  );
  assert.deepEqual(r.indexes, [1, 0]);
});

test("legacy fallbacks keep old behaviour", () => {
  const base = { images: imgs(3), colorIds: ["a", "b"], colorImageMap: { a: [0], b: [1] } };
  assert.deepEqual(orderProductGallery({ ...base }, "a"), { mode: "legacy", reason: "not-reviewed" });
  assert.deepEqual(orderProductGallery({ ...base, sharedImageUrls: null }, "a"), { mode: "legacy", reason: "not-reviewed" });
  assert.deepEqual(orderProductGallery({ ...base, colorImageMap: { a: [0] }, sharedImageUrls: [] }, "a"), { mode: "legacy", reason: "incomplete-map" });
  assert.deepEqual(orderProductGallery({ ...base, colorIds: [], sharedImageUrls: [] }, "a"), { mode: "legacy", reason: "no-colors" });
  assert.deepEqual(orderProductGallery({ ...base, sharedImageUrls: [] }, undefined), { mode: "legacy", reason: "no-color-selected" });
  assert.deepEqual(orderProductGallery({ ...base, sharedImageUrls: [] }, "zzz"), { mode: "legacy", reason: "unknown-color" });
  assert.deepEqual(orderProductGallery({ ...base, images: [], sharedImageUrls: [] }, "a"), { mode: "legacy", reason: "no-images" });
});

test("out-of-range / invalid map indexes are ignored; empty result for a color falls back", () => {
  const r = orderProductGallery(
    { images: imgs(2), colorIds: ["a"], colorImageMap: { a: [9, -1, "x"] }, sharedImageUrls: [] },
    "a",
  );
  assert.deepEqual(r, { mode: "legacy", reason: "incomplete-map" });
});

test("stale shared URL (no longer in images) is harmless", () => {
  const r = orderProductGallery(
    { images: imgs(2), colorIds: ["a"], colorImageMap: { a: [1] }, sharedImageUrls: ["gone"] },
    "a",
  );
  assert.deepEqual(r.indexes, [1, 0]);
});
