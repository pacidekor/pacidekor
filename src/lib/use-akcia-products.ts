"use client";

import { useEffect, useMemo, useState } from "react";
import { useProductCatalog } from "@/components/ProductCatalogProvider";
import {
  DISCOUNTS_EVENT,
  getAkciaProducts,
  readDiscounts,
} from "@/lib/discounts";
import { subscribeDiscounts } from "@/lib/discount-store";
import type { Product } from "@/lib/products";

export function useAkciaProducts() {
  const catalog = useProductCatalog();
  const [discountTick, setDiscountTick] = useState(0);

  useEffect(() => {
    function onDiscountsChanged() {
      setDiscountTick((value) => value + 1);
    }

    onDiscountsChanged();
    const unsubscribe = subscribeDiscounts(onDiscountsChanged);
    window.addEventListener(DISCOUNTS_EVENT, onDiscountsChanged);
    return () => {
      unsubscribe();
      window.removeEventListener(DISCOUNTS_EVENT, onDiscountsChanged);
    };
  }, []);

  return useMemo((): Product[] => {
    if (catalog.length === 0) return [];
    void discountTick;
    return getAkciaProducts(readDiscounts());
  }, [catalog, discountTick]);
}
