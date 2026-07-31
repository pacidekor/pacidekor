"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import type { Product } from "@/lib/products";
import {
  getProductCatalog,
  setProductCatalog,
  subscribeProductCatalog,
} from "@/lib/product-catalog";

export function ProductCatalogProvider({
  products,
  children,
}: {
  products: Product[];
  children: React.ReactNode;
}) {
  // Keep the in-memory catalog in sync before paint when possible.
  // Consumers (e.g. Akcia) must also subscribe — child effects can still
  // run before this layout effect on first mount.
  useLayoutEffect(() => {
    setProductCatalog(products);
  }, [products]);

  return children;
}

export function useProductCatalog() {
  return useSyncExternalStore(
    subscribeProductCatalog,
    getProductCatalog,
    () => [] as Product[],
  );
}
