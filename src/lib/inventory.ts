import type { Product } from "@/lib/products";

export const INVENTORY_STORAGE_KEY = "pacidekor.inventory";
export const INVENTORY_EVENT = "pacidekor:inventory";

export type InventoryEntry = {
  inStock: boolean;
  /** `null` = na sklade bez sledovania počtu kusov */
  quantity: number | null;
};

type InventoryMap = Record<string, InventoryEntry>;

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

export function readInventoryMap(): InventoryMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(INVENTORY_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as InventoryMap;
  } catch {
    return {};
  }
}

export function writeInventoryMap(map: InventoryMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(map));
  window.dispatchEvent(new Event(INVENTORY_EVENT));
}

export function getInventoryForProduct(product: Product): InventoryEntry {
  const stored = readInventoryMap()[product.id];
  if (stored) {
    // migrate old `{ quantity: 0 }` style entries
    return normalizeInventory({
      inStock: stored.inStock,
      quantity:
        stored.quantity === 0 && stored.inStock === false
          ? null
          : stored.quantity,
    });
  }
  return seedInventory(product);
}

export function setInventory(productId: string, entry: InventoryEntry) {
  const map = readInventoryMap();
  map[productId] = normalizeInventory(entry);
  writeInventoryMap(map);
  return map[productId];
}

/** Negative delta decreases stock. Unlimited stock ignores decreases. */
export function adjustInventory(
  product: Product,
  delta: number,
): { ok: boolean; entry: InventoryEntry } {
  const current = getInventoryForProduct(product);

  if (delta === 0) return { ok: true, entry: current };

  if (!current.inStock) {
    return { ok: false, entry: current };
  }

  // Unlimited – always allow, don't track
  if (current.quantity == null) {
    return { ok: true, entry: current };
  }

  if (delta < 0) {
    const need = Math.abs(delta);
    if (current.quantity < need) {
      return { ok: false, entry: current };
    }
    const next = normalizeInventory({
      inStock: true,
      quantity: current.quantity - need,
    });
    setInventory(product.id, next);
    return { ok: true, entry: next };
  }

  const next = normalizeInventory({
    inStock: true,
    quantity: current.quantity + delta,
  });
  setInventory(product.id, next);
  return { ok: true, entry: next };
}

export function inventoryLabel(entry: InventoryEntry) {
  if (!isInventoryAvailable(entry)) return "Nie je na sklade";
  if (entry.quantity == null) return "Na sklade";
  return `${entry.quantity} ks`;
}
