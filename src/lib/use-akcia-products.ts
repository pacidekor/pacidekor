"use client";

import { useEffect, useState } from "react";
import {
  DISCOUNTS_EVENT,
  getAkciaProducts,
  readDiscounts,
  seedDiscounts,
} from "@/lib/discounts";
import type { Product } from "@/lib/products";

export function useAkciaProducts() {
  const [items, setItems] = useState<Product[]>(() =>
    getAkciaProducts(seedDiscounts()),
  );

  useEffect(() => {
    function sync() {
      setItems(getAkciaProducts(readDiscounts()));
    }

    sync();
    window.addEventListener(DISCOUNTS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(DISCOUNTS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return items;
}
