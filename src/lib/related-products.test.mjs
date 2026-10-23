import test from "node:test";
import assert from "node:assert/strict";
import { getRelatedProducts } from "./related-products.ts";

const cards = ["a", "b", "c", "d", "e", "f"].map((slug) => ({ slug }));
const slugs = (items) => items.map((item) => item.slug);

test("recommendations keep rotation, exclude current product and wrap", () => {
  assert.deepEqual(slugs(getRelatedProducts(cards, "c")), ["d", "e", "f", "a"]);
  assert.deepEqual(slugs(getRelatedProducts(cards, "f")), ["a", "b", "c", "d"]);
});

test("missing current product starts at the first card", () => {
  assert.deepEqual(slugs(getRelatedProducts(cards, "missing")), ["a", "b", "c", "d"]);
});

test("small or empty catalogs never duplicate cards or return current product", () => {
  assert.deepEqual(getRelatedProducts([], "a"), []);
  assert.deepEqual(getRelatedProducts([{ slug: "a" }], "a"), []);
  assert.deepEqual(slugs(getRelatedProducts(cards.slice(0, 3), "b", 10)), ["c", "a"]);
  assert.deepEqual(getRelatedProducts(cards, "a", 0), []);
});

test("only selected raw rows need normalization, with data and ordering unchanged", () => {
  const rows = Array.from({ length: 24 }, (_, i) => ({
    slug: `p-${i}`, price: `${i},90`, in_stock: i % 2 === 0,
    color_ids: ["biela"], images: [`image-${i}`],
  }));
  const normalize = (row) => ({ ...row, normalized: true });
  const before = getRelatedProducts(rows.map(normalize), "p-8");
  let processed = 0;
  const after = getRelatedProducts(rows, "p-8").map((row) => {
    processed++;
    return normalize(row);
  });
  assert.deepEqual(after, before);
  assert.equal(processed, 4);
  assert.deepEqual(rows[0].images, ["image-0"]);
});
