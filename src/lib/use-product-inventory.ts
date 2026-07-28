"use client";

import { useEffect, useState } from "react";
import {
  getInventoryForProduct,
  INVENTORY_EVENT,
  seedInventory,
  type InventoryEntry,
} from "@/lib/inventory";
import type { Product } from "@/lib/products";

/**
 * Always starts from product seed (SSR-safe), then syncs localStorage after mount
 * to avoid hydration mismatches when admin overrides stock in the browser.
 */
export function useProductInventory(product: Product): InventoryEntry {
  const [entry, setEntry] = useState<InventoryEntry>(() =>
    seedInventory(product),
  );

  useEffect(() => {
    function sync() {
      setEntry(getInventoryForProduct(product));
    }

    sync();
    window.addEventListener(INVENTORY_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(INVENTORY_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [product]);

  return entry;
}
