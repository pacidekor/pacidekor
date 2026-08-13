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
import type { TaxonomyStore } from "@/lib/taxonomy-types";
import {
  getTaxonomySnapshot,
  hydrateTaxonomySnapshot,
  setTaxonomySnapshot,
  subscribeTaxonomy,
} from "@/lib/taxonomy-store";

/** Stable empty snapshots for useSyncExternalStore (new [] each call = infinite loop). */
const EMPTY_PRODUCTS: Product[] = [];
const EMPTY_DISCOUNTS: ProductDiscount[] = [];
const EMPTY_TAXONOMY: TaxonomyStore = {
  categories: [],
  subcategories: [],
  druhy: [],
};

export function ProductCatalogProvider({
  products,
  discounts = EMPTY_DISCOUNTS,
  taxonomy = EMPTY_TAXONOMY,
  children,
}: {
  products: Product[];
  discounts?: ProductDiscount[];
  taxonomy?: TaxonomyStore;
  children: React.ReactNode;
}) {
  useLayoutEffect(() => {
    setDiscountsSnapshot(discounts);
  }, [discounts]);

  // Make DB taxonomy available before children paint (nav / filters).
  hydrateTaxonomySnapshot(taxonomy);

  useLayoutEffect(() => {
    setTaxonomySnapshot(taxonomy);
  }, [taxonomy]);

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

export function useTaxonomy() {
  return useSyncExternalStore(
    subscribeTaxonomy,
    getTaxonomySnapshot,
    getTaxonomySnapshot,
  );
}
