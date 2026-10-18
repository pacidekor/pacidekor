import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeVariantSummary,
  discountIsPercentCompatible,
  formatVariantCountLabel,
  orderGalleryForTextVariant,
  pruneVariantImageUrls,
} from "./product-variants.ts";

describe("product-variants", () => {
  it("formats Slovak plural labels", () => {
    assert.equal(formatVariantCountLabel(1), null);
    assert.equal(formatVariantCountLabel(2), "2 varianty");
    assert.equal(formatVariantCountLabel(5), "5 variantov");
  });

  it("summary uses orderable prices when any available", () => {
    const summary = computeVariantSummary(
      "custom",
      [
        {
          id: "a",
          label: "S",
          priceCents: 500,
          available: false,
          sortOrder: 0,
          imageUrls: [],
        },
        {
          id: "b",
          label: "L",
          priceCents: 700,
          available: true,
          sortOrder: 1,
          imageUrls: [],
        },
        {
          id: "c",
          label: "XL",
          priceCents: 900,
          available: true,
          sortOrder: 2,
          imageUrls: [],
        },
      ],
      "Veľkosť",
      "b",
    );
    assert.equal(summary.totalCount, 3);
    assert.equal(summary.orderableCount, 2);
    assert.equal(summary.minPriceCents, 700);
    assert.equal(summary.priceVaries, true);
  });

  it("when all sold out, min is across all valid", () => {
    const summary = computeVariantSummary(
      "custom",
      [
        {
          id: "a",
          label: "S",
          priceCents: 500,
          available: false,
          sortOrder: 0,
          imageUrls: [],
        },
        {
          id: "b",
          label: "L",
          priceCents: 800,
          available: false,
          sortOrder: 1,
          imageUrls: [],
        },
      ],
      "Veľkosť",
      null,
    );
    assert.equal(summary.orderableCount, 0);
    assert.equal(summary.minPriceCents, 500);
  });

  it("gallery: variant urls first, shared last, unique", () => {
    const out = orderGalleryForTextVariant({
      images: ["a", "b", "c", "d"],
      sharedImageUrls: ["d"],
      variantImageUrls: ["c", "a"],
    });
    assert.deepEqual(out, ["c", "a", "b", "d"]);
  });

  it("prunes removed image urls", () => {
    const next = pruneVariantImageUrls(
      [
        {
          id: "1",
          label: "x",
          priceCents: 100,
          available: true,
          sortOrder: 0,
          imageUrls: ["keep", "gone"],
        },
      ],
      ["keep"],
    );
    assert.deepEqual(next[0].imageUrls, ["keep"]);
  });

  it("detects absolute sale conflict vs percent", () => {
    assert.equal(
      discountIsPercentCompatible({
        originalPrice: "10,00 €",
        salePrice: "8,00 €",
        discountPercent: 20,
      }),
      true,
    );
    assert.equal(
      discountIsPercentCompatible({
        originalPrice: "10,00 €",
        salePrice: "7,50 €",
        discountPercent: 20,
      }),
      false,
    );
  });
});
