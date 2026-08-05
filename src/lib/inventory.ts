import type { Product } from "@/lib/products";
import { adjustStockAction } from "@/lib/actions/inventory";
import {
  findCatalogProductById,
  patchProductInCatalog,
} from "@/lib/product-catalog";

export const INVENTORY_EVENT = "pacidekor:inventory";

export type InventoryEntry = {
  inStock: boolean;
  /** `null` = na sklade bez sledovania počtu kusov */
  quantity: number | null;
};

export function seedInventory(product: Product): InventoryEntry {
  if (product.inStock === false) {
    return { inStock: false, quantity: null };
  }

  if (product.stockQuantity == null) {
    return { inStock: true, quantity: null };
  }

  const quantity = Math.max(0, product.stockQuantity);
  if (quantity <= 0) {
    return { inStock: false, quantity: null };
  }

  return { inStock: true, quantity };
}

export function normalizeInventory(entry: InventoryEntry): InventoryEntry {
  if (!entry.inStock) {
    return { inStock: false, quantity: null };
  }

  if (entry.quantity == null || Number.isNaN(entry.quantity)) {
    return { inStock: true, quantity: null };
  }

  const quantity = Math.floor(entry.quantity);
  if (quantity <= 0) {
    return { inStock: false, quantity: null };
  }

  return { inStock: true, quantity };
}

export function isInventoryAvailable(entry: InventoryEntry) {
  if (!entry.inStock) return false;
  if (entry.quantity == null) return true;
  return entry.quantity > 0;
}

/** Max ks zákazník môže kúpiť; `undefined` = bez limitu */
export function inventoryMaxOrderable(entry: InventoryEntry) {
  if (!isInventoryAvailable(entry)) return 0;
  if (entry.quantity == null) return undefined;
  return entry.quantity;
}

export function getInventoryForProduct(product: Product): InventoryEntry {
  const live = findCatalogProductById(product.id) ?? product;
  return seedInventory(live);
}

function notifyInventory() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(INVENTORY_EVENT));
}

function applyStockToCatalog(
  productId: string,
  entry: { inStock: boolean; stockQuantity: number | null },
) {
  patchProductInCatalog(productId, {
    inStock: entry.inStock,
    stockQuantity: entry.stockQuantity ?? undefined,
  });
  notifyInventory();
}

/** Negative delta decreases stock in Supabase. Unlimited stock ignores decreases. */
export async function adjustInventory(
  product: Product,
  delta: number,
): Promise<{ ok: boolean; entry: InventoryEntry; error?: string }> {
  const current = getInventoryForProduct(product);
  if (delta === 0) return { ok: true, entry: current };

  const result = await adjustStockAction(product.id, delta);
  if (!result.ok) {
    return { ok: false, entry: current, error: result.error };
  }

  applyStockToCatalog(product.id, result.data);
  return {
    ok: true,
    entry: {
      inStock: result.data.inStock,
      quantity: result.data.stockQuantity,
    },
  };
}

/** Keep admin UI / local mirrors in sync after product save. */
export function setInventory(
  productId: string,
  entry: InventoryEntry,
): InventoryEntry {
  const next = normalizeInventory(entry);
  applyStockToCatalog(productId, {
    inStock: next.inStock,
    stockQuantity: next.quantity,
  });
  return next;
}

export function inventoryLabel(entry: InventoryEntry) {
  if (!isInventoryAvailable(entry)) return "Nie je na sklade";
  if (entry.quantity == null) return "Na sklade";
  return `${entry.quantity} ks`;
}
