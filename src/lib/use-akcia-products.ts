"use client";

import { useEffect, useMemo, useState } from "react";
import { useProductCatalog } from "@/components/ProductCatalogProvider";
import {
  DISCOUNTS_EVENT,
  getAkciaProducts,
  readDiscounts,
} from "@/lib/discounts";
import type { Product } from "@/lib/products";

export function useAkciaProducts() {
  const catalog = useProductCatalog();
  const [discountTick, setDiscountTick] = useState(0);

  useEffect(() => {
    function onDiscountsChanged() {
      setDiscountTick((value) => value + 1);
    }

    onDiscountsChanged();
    window.addEventListener(DISCOUNTS_EVENT, onDiscountsChanged);
    window.addEventListener("storage", onDiscountsChanged);
    return () => {
      window.removeEventListener(DISCOUNTS_EVENT, onDiscountsChanged);
      window.removeEventListener("storage", onDiscountsChanged);
    };
  }, []);

  return useMemo((): Product[] => {
    // Re-run when catalog hydrates from ProductCatalogProvider
    if (catalog.length === 0) return [];
    void discountTick;
    return getAkciaProducts(readDiscounts());
  }, [catalog, discountTick]);
}
