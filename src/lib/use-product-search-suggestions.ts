"use client";

import { useDeferredValue, useEffect, useState } from "react";
import type { Product } from "@/lib/products";

type SearchApiProduct = Pick<
  Product,
  | "id"
  | "slug"
  | "name"
  | "sku"
  | "price"
  | "originalPrice"
  | "discount"
  | "category"
  | "image"
  | "inStock"
  | "colors"
>;

function toProduct(row: SearchApiProduct): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    sku: row.sku,
    price: row.price,
    originalPrice: row.originalPrice,
    discount: row.discount,
    category: row.category,
    image: row.image,
    inStock: row.inStock,
    colors: row.colors,
    description: "",
    details: [],
  };
}

/**
 * Debounced storefront search suggestions via /api/search.
 * Guards against stale responses with AbortController.
 */
export function useProductSearchSuggestions(query: string, limit = 8) {
  const deferredQuery = useDeferredValue(query);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = deferredQuery.trim();
    if (!q) {
      setProducts([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      void (async () => {
        try {
          const res = await fetch(
            `/api/search?q=${encodeURIComponent(q)}&limit=${limit}`,
            { signal: controller.signal },
          );
          if (!res.ok) return;
          const data = (await res.json()) as { products?: SearchApiProduct[] };
          if (controller.signal.aborted) return;
          setProducts((data.products ?? []).map(toProduct));
        } catch (error) {
          if ((error as Error)?.name === "AbortError") return;
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      })();
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [deferredQuery, limit]);

  return { products, loading };
}
