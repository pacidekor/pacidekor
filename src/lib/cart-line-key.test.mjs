import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cartLineOptionKey,
  cartLineOptionKeyFromParts,
  migrateLegacyCartOptionKey,
  parseCartLineOptionKey,
} from "./cart-line-key.ts";

describe("cart-line-key", () => {
  it("uses separate namespaces for color and variant", () => {
    assert.equal(cartLineOptionKey({ kind: "none" }), "");
    assert.equal(
      cartLineOptionKey({ kind: "color", colorId: "biela" }),
      "c:biela",
    );
    assert.equal(
      cartLineOptionKey({ kind: "variant", variantId: "uuid-1" }),
      "v:uuid-1",
    );
  });

  it("parses keys without silent remap", () => {
    assert.deepEqual(parseCartLineOptionKey(""), { kind: "none" });
    assert.deepEqual(parseCartLineOptionKey("c:cervena"), {
      kind: "color",
      colorId: "cervena",
    });
    assert.deepEqual(parseCartLineOptionKey("v:abc"), {
      kind: "variant",
      variantId: "abc",
    });
    assert.deepEqual(parseCartLineOptionKey("weird"), { kind: "none" });
  });

  it("migrates legacy color_id only", () => {
    assert.equal(migrateLegacyCartOptionKey("biela"), "c:biela");
    assert.equal(migrateLegacyCartOptionKey(""), "");
    assert.equal(migrateLegacyCartOptionKey(null), "");
  });

  it("prefers variant over color when both passed", () => {
    assert.equal(
      cartLineOptionKeyFromParts({ colorId: "biela", variantId: "v1" }),
      "v:v1",
    );
  });
});
