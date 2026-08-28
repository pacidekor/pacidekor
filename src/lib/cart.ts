"use client";

import {
  clearCartAction,
  listCartAction,
  mergeGuestCartAction,
  setCartItemQuantityAction,
  upsertCartItemAction,
  type CartLineDto,
} from "@/lib/actions/cart";
import { getCachedClientAuthenticated } from "@/lib/client-auth";
import { adjustStockAction } from "@/lib/actions/inventory";
import { findCatalogProductById } from "@/lib/product-catalog";
import {
  applyInventoryLocally,
  getInventoryForProduct,
  previewInventoryDelta,
  setInventory,
} from "@/lib/inventory";
import {
  amountToMinOrder,
  formatPrice,
  meetsMinOrder,
  MIN_ORDER_TOTAL,
  parsePrice,
} from "@/lib/price";
import type { Product } from "@/lib/products";
import {
  getProductOrderMultiple,
  snapQuantityToMultiple,
} from "@/lib/taxonomy";

export {
  amountToMinOrder,
  formatPrice,
  meetsMinOrder,
  MIN_ORDER_TOTAL,
  parsePrice,
};

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

let accountCartCache: CartLineDto[] | null = null;

function notify() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CART_EVENT));
}

function useAccountCart() {
  return getCachedClientAuthenticated() === true && accountCartCache !== null;
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

function clearStoredGuestCart() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CART_KEY);
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

function lineToCartItemFromStored(line: StoredCartLine): CartItem {
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

function dtoToCartItem(line: CartLineDto): CartItem | null {
  const product = findCatalogProductById(line.productId);
  if (!product) return null;
  return {
    product,
    quantity: line.quantity,
    colorId: line.colorId,
  };
}

function setAccountCart(lines: CartLineDto[]) {
  accountCartCache = lines;
  notify();
}

/** Serializes account cart writes so rapid clicks don't race. */
let accountCartWriteChain: Promise<void> = Promise.resolve();

function enqueueAccountCartWrite(task: () => Promise<void>) {
  accountCartWriteChain = accountCartWriteChain.then(task).catch(() => {});
}

function patchAccountCartLine(
  lines: CartLineDto[],
  productId: string,
  quantity: number,
  colorId?: string,
): CartLineDto[] {
  if (quantity < 1) {
    return lines.filter((line) => line.productId !== productId);
  }

  const index = lines.findIndex((line) => line.productId === productId);
  if (index >= 0) {
    const next = lines.slice();
    const prev = next[index]!;
    next[index] = {
      productId,
      quantity,
      colorId: colorId ?? prev.colorId,
    };
    return next;
  }

  return [{ productId, quantity, colorId }, ...lines];
}

function lineQty(lines: CartLineDto[], productId: string) {
  return lines.find((line) => line.productId === productId)?.quantity ?? 0;
}

export function readGuestCartLines(): CartLineDto[] {
  return readStored().map((line) => ({
    productId: line.productId,
    quantity: line.quantity,
    colorId: line.colorId,
  }));
}

export function readCartItems(): CartItem[] {
  if (useAccountCart()) {
    return (accountCartCache ?? [])
      .map(dtoToCartItem)
      .filter((item): item is CartItem => item !== null);
  }
  return readStored().map(lineToCartItemFromStored);
}

export async function hydrateAccountCart(): Promise<CartItem[]> {
  const result = await listCartAction();
  if (!result.ok) {
    accountCartCache = null;
    notify();
    return readStored().map(lineToCartItemFromStored);
  }
  setAccountCart(result.data);
  return readCartItems();
}

export async function mergeGuestCartIntoAccount(): Promise<CartItem[]> {
  const guest = readGuestCartLines();
  if (guest.length === 0) {
    return hydrateAccountCart();
  }

  const result = await mergeGuestCartAction(guest);
  if (!result.ok) {
    throw new Error(result.error);
  }

  clearStoredGuestCart();
  setAccountCart(result.data);
  return readCartItems();
}

export function clearAccountCartCache() {
  accountCartCache = null;
  notify();
}

export async function addToCart(
  product: Product,
  quantity = 1,
  colorId?: string,
): Promise<CartItem[]> {
  const multiple = getProductOrderMultiple(product.attributes?.packaging);
  const qty = snapQuantityToMultiple(
    Math.max(1, Math.floor(quantity)),
    multiple,
  );
  if (qty <= 0) return readCartItems();

  if (getCachedClientAuthenticated() === true) {
    // Not hydrated yet — must wait for server (rare; AccountDataSync usually ran).
    if (accountCartCache === null) {
      const result = await upsertCartItemAction({
        productId: product.id,
        quantity: qty,
        colorId,
      });
      if (!result.ok) throw new Error(result.error);
      const listed = await listCartAction();
      if (listed.ok) setAccountCart(listed.data);
      else setAccountCart(result.data);
      return readCartItems();
    }

    const snapshot = accountCartCache;
    const nextQty = lineQty(snapshot, product.id) + qty;
    setAccountCart(
      patchAccountCartLine(snapshot, product.id, nextQty, colorId),
    );

    enqueueAccountCartWrite(async () => {
      const result = await upsertCartItemAction({
        productId: product.id,
        quantity: nextQty,
        colorId,
      });
      if (!result.ok) {
        setAccountCart(
          patchAccountCartLine(
            accountCartCache ?? snapshot,
            product.id,
            lineQty(snapshot, product.id),
            colorId,
          ),
        );
        window.alert(result.error);
        return;
      }
      // Confirm this line only — keep other optimistic lines intact.
      const confirmed = result.data[0];
      if (confirmed) {
        setAccountCart(
          patchAccountCartLine(
            accountCartCache ?? snapshot,
            confirmed.productId,
            confirmed.quantity,
            confirmed.colorId,
          ),
        );
      }
    });

    return readCartItems();
  }

  const lines = readStored();
  const index = lines.findIndex((line) => line.productId === product.id);

  if (index >= 0) {
    const current = lines[index]!;
    lines[index] = {
      ...toStoredLine(
        product,
        current.quantity + qty,
        colorId ?? current.colorId,
      ),
    };
  } else {
    lines.push(toStoredLine(product, qty, colorId));
  }

  writeStored(lines);
  return lines.map(lineToCartItemFromStored);
}

export async function setCartQuantity(
  productId: string,
  quantity: number,
): Promise<CartItem[]> {
  let qty = Math.floor(quantity);
  if (qty > 0) {
    const product = findCatalogProductById(productId);
    const multiple = getProductOrderMultiple(product?.attributes?.packaging);
    qty = snapQuantityToMultiple(qty, multiple);
  }

  if (getCachedClientAuthenticated() === true) {
    if (accountCartCache === null) {
      const result = await setCartItemQuantityAction(productId, qty);
      if (!result.ok) throw new Error(result.error);
      const listed = await listCartAction();
      if (listed.ok) setAccountCart(listed.data);
      return readCartItems();
    }

    const snapshot = accountCartCache;
    setAccountCart(patchAccountCartLine(snapshot, productId, qty));

    enqueueAccountCartWrite(async () => {
      const result = await setCartItemQuantityAction(productId, qty);
      if (!result.ok) {
        setAccountCart(
          patchAccountCartLine(
            accountCartCache ?? snapshot,
            productId,
            lineQty(snapshot, productId),
          ),
        );
        window.alert(result.error);
        return;
      }
      if (qty < 1) {
        setAccountCart(
          patchAccountCartLine(accountCartCache ?? snapshot, productId, 0),
        );
        return;
      }
      const confirmed = result.data[0];
      if (confirmed) {
        setAccountCart(
          patchAccountCartLine(
            accountCartCache ?? snapshot,
            confirmed.productId,
            confirmed.quantity,
            confirmed.colorId,
          ),
        );
      }
    });

    return readCartItems();
  }

  const lines = readStored();

  if (qty < 1) {
    const next = lines.filter((line) => line.productId !== productId);
    writeStored(next);
    return next.map(lineToCartItemFromStored);
  }

  const next = lines.map((line) =>
    line.productId === productId ? { ...line, quantity: qty } : line,
  );
  writeStored(next);
  return next.map(lineToCartItemFromStored);
}

export async function removeFromCart(productId: string): Promise<CartItem[]> {
  return setCartQuantity(productId, 0);
}

export async function clearCart() {
  if (getCachedClientAuthenticated() === true) {
    const snapshot = accountCartCache;
    setAccountCart([]);
    enqueueAccountCartWrite(async () => {
      const result = await clearCartAction();
      if (!result.ok) {
        if (snapshot) setAccountCart(snapshot);
        window.alert(result.error);
      }
    });
    return;
  }
  writeStored([]);
}

export type CartFillLine = {
  product: Product;
  quantity: number;
  colorId?: string;
};

/**
 * Replace the whole cart in one optimistic step (history repeat / templates).
 * UI updates immediately; Supabase cart + stock sync run in the background.
 */
export function replaceCartContents(lines: CartFillLine[]): number {
  const current = readCartItems();

  for (const item of current) {
    const restore = previewInventoryDelta(item.product, item.quantity);
    if (restore.ok) {
      applyInventoryLocally(item.product.id, restore.entry);
      if (restore.needsServerSync) {
        void adjustStockAction(item.product.id, item.quantity).then((result) => {
          if (!result.ok) return;
          setInventory(item.product.id, {
            inStock: result.data.inStock,
            quantity: result.data.stockQuantity,
          });
        });
      }
    }
  }

  const accepted: CartFillLine[] = [];
  for (const line of lines) {
    const qty = Math.max(1, Math.floor(line.quantity));
    const previous = getInventoryForProduct(line.product);
    const preview = previewInventoryDelta(line.product, -qty);
    if (!preview.ok) continue;
    applyInventoryLocally(line.product.id, preview.entry);
    if (preview.needsServerSync) {
      void adjustStockAction(line.product.id, -qty).then((result) => {
        if (!result.ok) {
          applyInventoryLocally(line.product.id, previous);
          return;
        }
        setInventory(line.product.id, {
          inStock: result.data.inStock,
          quantity: result.data.stockQuantity,
        });
      });
    }
    accepted.push({ ...line, quantity: qty });
  }

  if (getCachedClientAuthenticated() === true) {
    const nextDto: CartLineDto[] = accepted.map((line) => ({
      productId: line.product.id,
      quantity: line.quantity,
      colorId: line.colorId,
    }));
    setAccountCart(nextDto);

    const snapshot = nextDto;
    enqueueAccountCartWrite(async () => {
      const cleared = await clearCartAction();
      if (!cleared.ok) {
        window.alert(cleared.error);
        return;
      }
      for (const line of snapshot) {
        const result = await upsertCartItemAction({
          productId: line.productId,
          quantity: line.quantity,
          colorId: line.colorId,
        });
        if (!result.ok) {
          window.alert(result.error);
          return;
        }
      }
    });

    return accepted.length;
  }

  writeStored(
    accepted.map((line) =>
      toStoredLine(line.product, line.quantity, line.colorId),
    ),
  );
  return accepted.length;
}

export type AddLinesToCartResult = {
  added: number;
  skipped: number;
};

/**
 * Add lines on top of the current cart (favorites → cart).
 * Skips sold-out items. Optimistic UI + background sync.
 */
export function addLinesToCart(lines: CartFillLine[]): AddLinesToCartResult {
  let added = 0;
  let skipped = 0;

  for (const line of lines) {
    const multiple = getProductOrderMultiple(line.product.attributes?.packaging);
    const qty = snapQuantityToMultiple(
      Math.max(1, Math.floor(line.quantity)),
      multiple,
    );
    if (qty <= 0) {
      skipped += 1;
      continue;
    }
    const previous = getInventoryForProduct(line.product);
    const preview = previewInventoryDelta(line.product, -qty);
    if (!preview.ok) {
      skipped += 1;
      continue;
    }

    applyInventoryLocally(line.product.id, preview.entry);
    if (preview.needsServerSync) {
      void adjustStockAction(line.product.id, -qty).then((result) => {
        if (!result.ok) {
          applyInventoryLocally(line.product.id, previous);
          return;
        }
        setInventory(line.product.id, {
          inStock: result.data.inStock,
          quantity: result.data.stockQuantity,
        });
      });
    }

    void addToCart(line.product, qty, line.colorId).catch(() => {
      applyInventoryLocally(line.product.id, previous);
    });
    added += 1;
  }

  return { added, skipped };
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
