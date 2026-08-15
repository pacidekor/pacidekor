"use client";

import { useMemo } from "react";
import { useProductCatalog } from "@/components/ProductCatalogProvider";
import type { Product } from "@/lib/products";

/** Vezme produkt z live katalógu (so zľavami), inak fallback na props. */
export function usePricedProduct(product: Product): Product {
  const catalog = useProductCatalog();
  return useMemo(() => {
    if (catalog.length === 0) return product;
    return catalog.find((item) => item.id === product.id) ?? product;
  }, [catalog, product]);
}

/** Namapuje zoznam produktov na aktuálne ceny/zľavy z katalógu. */
export function usePricedProducts(products: Product[]): Product[] {
  const catalog = useProductCatalog();
  return useMemo(() => {
    if (catalog.length === 0) return products;
    const byId = new Map(catalog.map((item) => [item.id, item]));
    return products.map((item) => byId.get(item.id) ?? item);
  }, [catalog, products]);
}
