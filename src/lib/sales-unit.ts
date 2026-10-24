/** A set is ONE sale/stock unit; contained pieces never multiply the order. */
export type SalesPackaging = { id: string; pieces: number; label?: string };
export const SET_PACKAGING_ID = "sada";

export function getSetSize(packaging?: SalesPackaging[] | null): number | null {
  const set = packaging?.find((item) => item.id === SET_PACKAGING_ID);
  return set && Number.isInteger(set.pieces) && set.pieces > 0 ? set.pieces : null;
}

export function salesUnitLabel(packaging?: SalesPackaging[] | null): "sada" | "ks" {
  return getSetSize(packaging) !== null ? "sada" : "ks";
}

export function salesContentsLabel(packaging?: SalesPackaging[] | null): string | null {
  const size = getSetSize(packaging);
  return size === null ? null : `Sada obsahuje ${size} ks`;
}

export function salesQuantityLabel(quantity: number, packaging?: SalesPackaging[] | null): string {
  if (getSetSize(packaging) === null) return `${quantity} ks`;
  return `${quantity} ${quantity === 1 ? "sada" : quantity >= 2 && quantity <= 4 ? "sady" : "sád"}`;
}

export function salesOrderName(name: string, packaging?: SalesPackaging[] | null): string {
  const size = getSetSize(packaging);
  return size === null ? name : `${name} (sada ${size} ks)`;
}
