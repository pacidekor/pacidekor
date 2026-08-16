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

/**
 * Local stock preview without waiting for Supabase.
 * Unlimited stock (`quantity === null`) always succeeds for decreases.
 */
export function previewInventoryDelta(
  product: Product,
  delta: number,
): { ok: boolean; entry: InventoryEntry; needsServerSync: boolean } {
  const current = getInventoryForProduct(product);
  if (delta === 0) {
    return { ok: true, entry: current, needsServerSync: false };
  }

  if (delta < 0) {
    if (!isInventoryAvailable(current)) {
      return { ok: false, entry: current, needsServerSync: false };
    }
    if (current.quantity == null) {
      return { ok: true, entry: current, needsServerSync: false };
    }
    const nextQty = current.quantity + delta;
    if (nextQty < 0) {
      return { ok: false, entry: current, needsServerSync: false };
    }
    return {
      ok: true,
      entry: normalizeInventory({ inStock: nextQty > 0, quantity: nextQty }),
      needsServerSync: true,
    };
  }

  // Restock / undo
  if (current.quantity == null) {
    return {
      ok: true,
      entry: { inStock: true, quantity: null },
      needsServerSync: false,
    };
  }
  const nextQty = (current.inStock ? current.quantity : 0) + delta;
  return {
    ok: true,
    entry: normalizeInventory({ inStock: true, quantity: nextQty }),
    needsServerSync: true,
  };
}

export function applyInventoryLocally(
  productId: string,
  entry: InventoryEntry,
) {
  applyStockToCatalog(productId, {
    inStock: entry.inStock,
    stockQuantity: entry.quantity,
  });
}

/**
 * Optimistic local stock change, then background Supabase sync.
 * Rolls local state back if the server rejects the delta.
 */
export async function adjustInventory(
  product: Product,
  delta: number,
): Promise<{ ok: boolean; entry: InventoryEntry; error?: string }> {
  const preview = previewInventoryDelta(product, delta);
  if (!preview.ok) {
    return { ok: false, entry: preview.entry, error: "Nedostatok skladu." };
  }

  if (!preview.needsServerSync) {
    return { ok: true, entry: preview.entry };
  }

  const previous = getInventoryForProduct(product);
  applyInventoryLocally(product.id, preview.entry);

  void adjustStockAction(product.id, delta).then((result) => {
    if (!result.ok) {
      applyInventoryLocally(product.id, previous);
      return;
    }
    applyStockToCatalog(product.id, result.data);
  });

  return { ok: true, entry: preview.entry };
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
