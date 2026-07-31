import type { Product } from "@/lib/products";

export type CartItem = {
  product: Product;
  quantity: number;
};

/** Empty until cart is wired to real persistence. */
export const mockCartItems: CartItem[] = [];

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
