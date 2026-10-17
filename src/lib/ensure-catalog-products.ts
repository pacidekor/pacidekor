"use client";

import {
  findCatalogProductById,
  mergeProductsIntoCatalog,
} from "@/lib/product-catalog";
import type { Product } from "@/lib/products";

const MAX_IDS_PER_REQUEST = 100;

type ApiProduct = {
  id: string;
  slug: string;
  name: string;
  sku?: string;
  price: string;
  originalPrice?: string;
  discount?: number;
  category: string;
  image: string;
  hoverImage?: string;
  inStock?: boolean;
  stockQuantity?: number;
  attributes?: Product["attributes"];
  colors?: Product["colors"];
  unavailableColorIds?: string[];
};

export type EnsureCatalogResult = {
  ok: boolean;
  /** IDs that were requested but not returned (removed / inactive). */
  unavailableIds: string[];
};

function toProduct(row: ApiProduct): Product {
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
    hoverImage: row.hoverImage,
    inStock: row.inStock,
    stockQuantity: row.stockQuantity,
    attributes: row.attributes,
    colors: row.colors,
    unavailableColorIds: row.unavailableColorIds ?? [],
    description: "",
    details: [],
  };
}

/** Known-missing product ids — skip refetch loops after a successful 200. */
const unavailableIds = new Set<string>();

/** Coalesce identical in-flight batches. */
const inFlight = new Map<string, Promise<EnsureCatalogResult>>();

function batchKey(ids: string[]) {
  return [...ids].sort().join(",");
}

/**
 * Fetch missing products into the client catalog store (cart / favorites).
 * Batched, deduped, capped; does not retry known-unavailable ids forever.
 */
export async function ensureCatalogProducts(
  ids: string[],
): Promise<EnsureCatalogResult> {
  const unique = [
    ...new Set(ids.map((id) => id.trim()).filter(Boolean)),
  ].filter((id) => !unavailableIds.has(id) && !findCatalogProductById(id));

  if (unique.length === 0) {
    return { ok: true, unavailableIds: [] };
  }

  const missing = unique.slice(0, MAX_IDS_PER_REQUEST);
  const key = batchKey(missing);
  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = (async (): Promise<EnsureCatalogResult> => {
    try {
      const res = await fetch(
        `/api/products/by-ids?ids=${encodeURIComponent(missing.join(","))}`,
      );
      if (!res.ok) {
        return { ok: false, unavailableIds: [] };
      }

      const data = (await res.json()) as { products?: ApiProduct[] };
      const products = (data.products ?? []).map(toProduct);
      mergeProductsIntoCatalog(products);

      const found = new Set(products.map((product) => product.id));
      const notFound = missing.filter((id) => !found.has(id));
      for (const id of notFound) unavailableIds.add(id);

      return { ok: true, unavailableIds: notFound };
    } catch {
      // Network error — allow retry later (do not mark unavailable).
      return { ok: false, unavailableIds: [] };
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
  return promise;
}

export function isCatalogProductKnownUnavailable(id: string) {
  return unavailableIds.has(id);
}

/** Test helper / logout cleanup. */
export function clearEnsureCatalogState() {
  unavailableIds.clear();
  inFlight.clear();
}
