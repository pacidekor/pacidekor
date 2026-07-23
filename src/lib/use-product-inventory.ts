"use client";

import { useEffect, useState } from "react";
import {
  getInventoryForProduct,
  INVENTORY_EVENT,
  type InventoryEntry,
} from "@/lib/inventory";
import type { Product } from "@/lib/products";

export function useProductInventory(product: Product): InventoryEntry {
  const [entry, setEntry] = useState<InventoryEntry>(() =>
    getInventoryForProduct(product),
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
