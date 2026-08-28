/** Shared price helpers safe for server and client. */

/** Slovak standard VAT rate. Catalog prices are stored excluding VAT. */
export const VAT_RATE = 0.23;

export function parsePrice(price: string) {
  return Number.parseFloat(
    price.replace(/\s/g, "").replace("€", "").replace(",", "."),
  );
}

export function formatPrice(value: number) {
  return `${value.toFixed(2).replace(".", ",")} €`;
}

/** Catalog / net price → amount including VAT. */
export function priceIncludingVat(priceExcludingVat: number) {
  if (!Number.isFinite(priceExcludingVat) || priceExcludingVat <= 0) return 0;
  return priceExcludingVat * (1 + VAT_RATE);
}

/** Reverse: gross → net (e.g. one-off corrections). */
export function priceExcludingVat(priceIncludingVatAmount: number) {
  if (
    !Number.isFinite(priceIncludingVatAmount) ||
    priceIncludingVatAmount <= 0
  ) {
    return 0;
  }
  return priceIncludingVatAmount / (1 + VAT_RATE);
}

/** Format a catalog (ex-VAT) price string as the with-VAT amount. */
export function formatPriceIncVat(priceExcludingVat: string) {
  return formatPrice(priceIncludingVat(parsePrice(priceExcludingVat)));
}

/** e.g. `12,18 € s DPH` from a catalog (ex-VAT) price string. */
export function formatPriceIncVatLabel(priceExcludingVat: string) {
  return `${formatPriceIncVat(priceExcludingVat)} s DPH`;
}

/** Catalog price is already ex-VAT – normalize formatting. */
export function formatPriceExVat(priceExcludingVat: string) {
  const parsed = parsePrice(priceExcludingVat);
  if (!Number.isFinite(parsed)) return priceExcludingVat;
  return formatPrice(parsed);
}

/** e.g. `9,90 € bez DPH` from a catalog (ex-VAT) price string. */
export function formatPriceExVatLabel(priceExcludingVat: string) {
  return `${formatPriceExVat(priceExcludingVat)} bez DPH`;
}

/** Net amount already in euros (cart subtotal for wholesale). */
export function formatAmountExVat(amountExcludingVat: number) {
  return formatPrice(amountExcludingVat);
}

/** Net cart amount → display with VAT (retail). */
export function formatAmountIncVat(amountExcludingVat: number) {
  return formatPrice(priceIncludingVat(amountExcludingVat));
}

/** Minimum cart subtotal (€, customer-facing) required to continue to checkout. */
export const MIN_ORDER_TOTAL = 10;

export function amountToMinOrder(subtotal: number) {
  return Math.max(0, MIN_ORDER_TOTAL - subtotal);
}

export function meetsMinOrder(subtotal: number) {
  return subtotal >= MIN_ORDER_TOTAL;
}
