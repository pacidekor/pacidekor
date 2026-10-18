/**
 * Client-side merge helpers (subtract / union). Server idempotency: sql/09-*.sql
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

function cartLineCompositeKey(productId, lineOptionKey) {
  return `${productId}\0${lineOptionKey}`;
}

function qtyMapFromLines(lines) {
  const map = {};
  for (const line of lines) {
    const key = cartLineCompositeKey(line.productId, line.lineOptionKey);
    map[key] = (map[key] ?? 0) + Math.max(1, Math.floor(line.quantity));
  }
  return map;
}

function unionMergeLines(a, b) {
  const map = new Map();
  for (const line of [...a, ...b]) {
    const key = cartLineCompositeKey(line.productId, line.lineOptionKey);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...line, quantity: Math.max(1, Math.floor(line.quantity)) });
      continue;
    }
    map.set(key, {
      ...prev,
      quantity:
        Math.max(1, Math.floor(prev.quantity)) +
        Math.max(1, Math.floor(line.quantity)),
    });
  }
  return [...map.values()];
}

function subtractMergeLines(live, snapshot) {
  const removeQty = qtyMapFromLines(snapshot);
  const out = [];
  for (const line of live) {
    const key = cartLineCompositeKey(line.productId, line.lineOptionKey);
    const drop = removeQty[key] ?? 0;
    const next = Math.max(1, Math.floor(line.quantity)) - drop;
    if (next > 0) out.push({ ...line, quantity: next });
  }
  return out;
}

describe("subtractMergeLines", () => {
  it("after confirm, restored snapshot is stripped; mid-flight extra kept", () => {
    const snapshot = [
      { productId: "p1", quantity: 2, lineOptionKey: "c:biela" },
    ];
    const liveAfterErrorRestore = unionMergeLines(snapshot, [
      { productId: "p1", quantity: 1, lineOptionKey: "c:hneda" },
    ]);
    const afterConfirm = subtractMergeLines(liveAfterErrorRestore, snapshot);
    assert.equal(afterConfirm.length, 1);
    assert.equal(afterConfirm[0].lineOptionKey, "c:hneda");
    assert.equal(afterConfirm[0].quantity, 1);
  });
});

describe("unionMergeLines", () => {
  it("preserves mid-flight guest adds on error restore", () => {
    const pending = [
      { productId: "p1", quantity: 2, lineOptionKey: "c:biela" },
    ];
    const midFlight = [
      { productId: "p1", quantity: 1, lineOptionKey: "c:hneda" },
    ];
    assert.equal(unionMergeLines(pending, midFlight).length, 2);
  });
});
