import { products, type Product } from "@/lib/products";

export type CartItem = {
  product: Product;
  quantity: number;
};

/** Demo cart contents for the header dropdown and cart page showcase. */
export const mockCartItems: CartItem[] = [
  { product: products[0], quantity: 2 }, // Kytica červených ruží
  { product: products[1], quantity: 5 }, // Kytica bielych pivónií
  { product: products[5], quantity: 1 }, // Kytica staroružových pivónií
  { product: products[3], quantity: 3 }, // Umelý vres fialový
  { product: products[8], quantity: 4 }, // Kytica bordových dálií
];

export function parsePrice(price: string) {
  return Number.parseFloat(
    price.replace(/\s/g, "").replace("€", "").replace(",", "."),
  );
}

export function formatPrice(value: number) {
  return `${value.toFixed(2).replace(".", ",")} €`;
}

export function cartItemCount(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function cartSubtotal(items: CartItem[]) {
  return items.reduce(
    (sum, item) => sum + parsePrice(item.product.price) * item.quantity,
    0,
  );
}
