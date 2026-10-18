import { cartLineCompositeKey } from "./cart-line-key";

/** Pure helpers for guest→account merge durability (testable without DOM). */

export type MergeQtyMap = Record<string, number>;

export type MergeLineLike = {
  productId: string;
  quantity: number;
  lineOptionKey: string;
};

export function qtyMapFromLines(lines: MergeLineLike[]): MergeQtyMap {
  const map: MergeQtyMap = {};
  for (const line of lines) {
    const key = cartLineCompositeKey(line.productId, line.lineOptionKey);
    map[key] = (map[key] ?? 0) + Math.max(1, Math.floor(line.quantity));
  }
  return map;
}

/**
 * True when account cart after a merge attempt already includes every guest
 * line at least at before[key] + guest[key] (merge write reached the server).
 */
export function mergeLooksApplied(
  beforeQty: MergeQtyMap,
  guestLines: MergeLineLike[],
  afterLines: MergeLineLike[],
): boolean {
  if (guestLines.length === 0) return true;
  const afterQty = qtyMapFromLines(afterLines);
  for (const guest of guestLines) {
    const key = cartLineCompositeKey(guest.productId, guest.lineOptionKey);
    const add = Math.max(1, Math.floor(guest.quantity));
    const expectedMin = (beforeQty[key] ?? 0) + add;
    if ((afterQty[key] ?? 0) < expectedMin) return false;
  }
  return true;
}

/** Union guest snapshots by line key (quantities add). */
export function unionMergeLines<T extends MergeLineLike>(a: T[], b: T[]): T[] {
  const map = new Map<string, T>();
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

/**
 * After a confirmed merge, remove the restored snapshot quantities from the
 * live guest cart so the same lines are not merged again under a new ID.
 * Mid-flight extras (not covered by snapshot qty) remain.
 */
export function subtractMergeLines<T extends MergeLineLike>(
  live: T[],
  snapshot: T[],
): T[] {
  const removeQty = qtyMapFromLines(snapshot);
  const out: T[] = [];
  for (const line of live) {
    const key = cartLineCompositeKey(line.productId, line.lineOptionKey);
    const drop = removeQty[key] ?? 0;
    const next = Math.max(1, Math.floor(line.quantity)) - drop;
    if (next > 0) {
      out.push({ ...line, quantity: next });
    }
  }
  return out;
}
