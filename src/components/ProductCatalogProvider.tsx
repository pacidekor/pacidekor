"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import type { ProductDiscount } from "@/lib/discounts";
import { applyDiscountsToProducts } from "@/lib/discounts";
import {
  getDiscountsSnapshot,
  setDiscountsSnapshot,
  subscribeDiscounts,
} from "@/lib/discount-store";
import type { Product } from "@/lib/products";
import {
  getProductCatalog,
  setProductCatalog,
  subscribeProductCatalog,
} from "@/lib/product-catalog";

/** Stable empty snapshots for useSyncExternalStore (new [] each call = infinite loop). */
const EMPTY_PRODUCTS: Product[] = [];
const EMPTY_DISCOUNTS: ProductDiscount[] = [];

export function ProductCatalogProvider({
  products,
  discounts = EMPTY_DISCOUNTS,
  children,
}: {
  products: Product[];
  discounts?: ProductDiscount[];
  children: React.ReactNode;
}) {
  useLayoutEffect(() => {
    setDiscountsSnapshot(discounts);
  }, [discounts]);

  const liveDiscounts = useSyncExternalStore(
    subscribeDiscounts,
    getDiscountsSnapshot,
    () => discounts,
  );

  useLayoutEffect(() => {
    setProductCatalog(applyDiscountsToProducts(products, liveDiscounts));
  }, [products, liveDiscounts]);

  return children;
}

export function useProductCatalog() {
  return useSyncExternalStore(
    subscribeProductCatalog,
    getProductCatalog,
    () => EMPTY_PRODUCTS,
  );
}

export function useDiscounts() {
  return useSyncExternalStore(
    subscribeDiscounts,
    getDiscountsSnapshot,
    () => EMPTY_DISCOUNTS,
  );
}
