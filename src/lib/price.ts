/** Shared price helpers safe for server and client. */

export function parsePrice(price: string) {
  return Number.parseFloat(
    price.replace(/\s/g, "").replace("€", "").replace(",", "."),
  );
}

export function formatPrice(value: number) {
  return `${value.toFixed(2).replace(".", ",")} €`;
}

/** Minimum cart subtotal (€) required to continue to checkout. */
export const MIN_ORDER_TOTAL = 10;

export function amountToMinOrder(subtotal: number) {
  return Math.max(0, MIN_ORDER_TOTAL - subtotal);
}

export function meetsMinOrder(subtotal: number) {
  return subtotal >= MIN_ORDER_TOTAL;
}
