/** Shared price helpers safe for server and client. */

/** Slovak standard VAT rate (katalogové ceny = včetně DPH). */
export const VAT_RATE = 0.23;

export function parsePrice(price: string) {
  return Number.parseFloat(
    price.replace(/\s/g, "").replace("€", "").replace(",", "."),
  );
}

export function formatPrice(value: number) {
  return `${value.toFixed(2).replace(".", ",")} €`;
}

/** Catalog price (incl. VAT) → amount excluding VAT. */
export function priceExcludingVat(priceIncludingVat: number) {
  if (!Number.isFinite(priceIncludingVat) || priceIncludingVat <= 0) return 0;
  return priceIncludingVat / (1 + VAT_RATE);
}

/** Format a catalog price string as the ex-VAT amount. */
export function formatPriceExVat(priceIncludingVat: string) {
  return formatPrice(priceExcludingVat(parsePrice(priceIncludingVat)));
}

/** e.g. `0,81 € bez DPH` from a catalog (inc-VAT) price string. */
export function formatPriceExVatLabel(priceIncludingVat: string) {
  return `${formatPriceExVat(priceIncludingVat)} bez DPH`;
}

/** Ex-VAT display for a numeric amount that is stored including VAT. */
export function formatAmountExVat(amountIncludingVat: number) {
  return formatPrice(priceExcludingVat(amountIncludingVat));
}

/** Minimum cart subtotal (€) required to continue to checkout. */
export const MIN_ORDER_TOTAL = 10;

export function amountToMinOrder(subtotal: number) {
  return Math.max(0, MIN_ORDER_TOTAL - subtotal);
}

export function meetsMinOrder(subtotal: number) {
  return subtotal >= MIN_ORDER_TOTAL;
}
