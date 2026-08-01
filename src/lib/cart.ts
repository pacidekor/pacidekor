import { findCatalogProductById } from "@/lib/product-catalog";
import type { Product } from "@/lib/products";

export const CART_KEY = "pacidekor-cart";
export const CART_EVENT = "pacidekor:cart-changed";

export type CartItem = {
  product: Product;
  quantity: number;
  colorId?: string;
};

type StoredCartLine = {
  productId: string;
  quantity: number;
  slug: string;
  name: string;
  price: string;
  image: string;
  category: string;
  colorId?: string;
};

function notify() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CART_EVENT));
}

function readStored(): StoredCartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Partial<StoredCartLine>;
      if (
        typeof row.productId !== "string" ||
        typeof row.quantity !== "number" ||
        !Number.isFinite(row.quantity) ||
        row.quantity < 1 ||
        typeof row.slug !== "string" ||
        typeof row.name !== "string" ||
        typeof row.price !== "string" ||
        typeof row.image !== "string" ||
        typeof row.category !== "string"
      ) {
        return [];
      }

      return [
        {
          productId: row.productId,
          quantity: Math.floor(row.quantity),
          slug: row.slug,
          name: row.name,
          price: row.price,
          image: row.image,
          category: row.category,
          colorId:
            typeof row.colorId === "string" && row.colorId
              ? row.colorId
              : undefined,
        },
      ];
    });
  } catch {
    return [];
  }
}

function writeStored(lines: StoredCartLine[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CART_KEY, JSON.stringify(lines));
  notify();
}

function toStoredLine(
  product: Product,
  quantity: number,
  colorId?: string,
): StoredCartLine {
  return {
    productId: product.id,
    quantity,
    slug: product.slug,
    name: product.name,
    price: product.price,
    image: product.image,
    category: product.category,
    colorId: colorId || undefined,
  };
}

function lineToCartItem(line: StoredCartLine): CartItem {
  const live = findCatalogProductById(line.productId);
  return {
    product:
      live ??
      ({
        id: line.productId,
        slug: line.slug,
        name: line.name,
        description: "",
        price: line.price,
        image: line.image,
        category: line.category,
        details: [],
      } satisfies Product),
    quantity: line.quantity,
    colorId: line.colorId,
  };
}

export function readCartItems(): CartItem[] {
  return readStored().map(lineToCartItem);
}

export function addToCart(
  product: Product,
  quantity = 1,
  colorId?: string,
): CartItem[] {
  if (typeof window === "undefined") return [];
  const qty = Math.max(1, Math.floor(quantity));
  const lines = readStored();
  const index = lines.findIndex((line) => line.productId === product.id);

  if (index >= 0) {
    const current = lines[index]!;
    lines[index] = {
      ...toStoredLine(product, current.quantity + qty, colorId ?? current.colorId),
    };
  } else {
    lines.push(toStoredLine(product, qty, colorId));
  }

  writeStored(lines);
  return lines.map(lineToCartItem);
}

export function setCartQuantity(productId: string, quantity: number): CartItem[] {
  const qty = Math.floor(quantity);
  const lines = readStored();

  if (qty < 1) {
    const next = lines.filter((line) => line.productId !== productId);
    writeStored(next);
    return next.map(lineToCartItem);
  }

  const next = lines.map((line) =>
    line.productId === productId ? { ...line, quantity: qty } : line,
  );
  writeStored(next);
  return next.map(lineToCartItem);
}

export function removeFromCart(productId: string): CartItem[] {
  const next = readStored().filter((line) => line.productId !== productId);
  writeStored(next);
  return next.map(lineToCartItem);
}

export function clearCart() {
  writeStored([]);
}

export function parsePrice(price: string) {
  return Number.parseFloat(
    price.replace(/\s/g, "").replace("€", "").replace(",", "."),
  );
}

export function formatPrice(value: number) {
  return `${value.toFixed(2).replace(".", ",")} €`;
}

/** Number of distinct products (cart lines), not total pieces. */
export function cartItemCount(items: CartItem[]) {
  return items.length;
}

/** Total quantity across all lines (ks). */
export function cartPieceCount(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function cartSubtotal(items: CartItem[]) {
  return items.reduce(
    (sum, item) => sum + parsePrice(item.product.price) * item.quantity,
    0,
  );
}

/** Minimum cart subtotal (€) required to continue to checkout. */
export const MIN_ORDER_TOTAL = 10;

export function amountToMinOrder(subtotal: number) {
  return Math.max(0, MIN_ORDER_TOTAL - subtotal);
}

export function meetsMinOrder(subtotal: number) {
  return subtotal >= MIN_ORDER_TOTAL;
}
