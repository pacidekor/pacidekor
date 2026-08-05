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
 * Live inventory derived from the product catalog (Supabase stock fields).
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
    return () => {
      window.removeEventListener(INVENTORY_EVENT, sync);
    };
  }, [product]);

  return entry;
}
