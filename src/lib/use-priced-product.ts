"use client";

import { useMemo } from "react";
import {
  useDiscounts,
  useProductCatalog,
} from "@/components/ProductCatalogProvider";
import { applyDiscountToProduct } from "@/lib/discounts";
import type { Product } from "@/lib/products";

let catalogRef: Product[] | null = null;
let catalogById: Map<string, Product> | null = null;

function getCatalogById(catalog: Product[]) {
  if (catalog === catalogRef && catalogById) return catalogById;
  catalogRef = catalog;
  catalogById = new Map(catalog.map((item) => [item.id, item]));
  return catalogById;
}

/** Live discount overlay — prefers hydrated catalog when present (account/admin). */
export function usePricedProduct(product: Product): Product {
  const catalog = useProductCatalog();
  const discounts = useDiscounts();
  return useMemo(() => {
    if (catalog.length > 0) {
      return getCatalogById(catalog).get(product.id) ?? product;
    }
    return applyDiscountToProduct(product, discounts);
  }, [catalog, discounts, product]);
}

/** Namapuje zoznam produktov na aktuálne ceny/zľavy. */
export function usePricedProducts(products: Product[]): Product[] {
  const catalog = useProductCatalog();
  const discounts = useDiscounts();
  return useMemo(() => {
    if (catalog.length > 0) {
      const byId = getCatalogById(catalog);
      return products.map((item) => byId.get(item.id) ?? item);
    }
    return products.map((item) => applyDiscountToProduct(item, discounts));
  }, [catalog, discounts, products]);
}
