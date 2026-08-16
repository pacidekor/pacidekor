"use client";

import {
  listFavoriteIdsAction,
  toggleFavoriteAction,
} from "@/lib/actions/favorites";
import type { Product } from "@/lib/products";
import { findCatalogProductsByIds } from "@/lib/product-catalog";
import { productCountLabel } from "@/lib/product-count";

export const FAVORITES_EVENT = "pacidekor:favorites-changed";

let favoriteIdsCache: string[] = [];
let hydrated = false;
/** Per-product toggle generation — ignores stale server responses. */
const toggleSeqById = new Map<string, number>();

function notify() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(FAVORITES_EVENT));
}

export function getFavoriteIdsSnapshot(): string[] {
  return favoriteIdsCache;
}

export function isFavorite(productId: string): boolean {
  return favoriteIdsCache.includes(productId);
}

export function setFavoriteIdsSnapshot(ids: string[]) {
  favoriteIdsCache = ids;
  hydrated = true;
  notify();
}

export async function hydrateFavorites(): Promise<string[]> {
  const result = await listFavoriteIdsAction();
  if (!result.ok) {
    favoriteIdsCache = [];
    hydrated = true;
    notify();
    return [];
  }
  setFavoriteIdsSnapshot(result.data);
  return result.data;
}

export function areFavoritesHydrated() {
  return hydrated;
}

/**
 * Instant UI toggle; persists to Supabase in the background and rolls back on failure.
 */
export async function toggleFavorite(productId: string): Promise<boolean> {
  const previous = favoriteIdsCache;
  const wasActive = previous.includes(productId);
  const nextActive = !wasActive;
  const optimistic = nextActive
    ? [productId, ...previous.filter((id) => id !== productId)]
    : previous.filter((id) => id !== productId);

  setFavoriteIdsSnapshot(optimistic);

  const seq = (toggleSeqById.get(productId) ?? 0) + 1;
  toggleSeqById.set(productId, seq);

  void (async () => {
    const result = await toggleFavoriteAction(productId);
    if (toggleSeqById.get(productId) !== seq) return;

    if (!result.ok) {
      const without = favoriteIdsCache.filter((id) => id !== productId);
      setFavoriteIdsSnapshot(wasActive ? [productId, ...without] : without);
      window.alert(result.error);
      toggleSeqById.delete(productId);
      return;
    }

    // Keep optimistic list; only fix this product if server disagreed.
    const has = favoriteIdsCache.includes(productId);
    if (has !== result.data.active) {
      const without = favoriteIdsCache.filter((id) => id !== productId);
      setFavoriteIdsSnapshot(
        result.data.active ? [productId, ...without] : without,
      );
    }
    toggleSeqById.delete(productId);
  })();

  return nextActive;
}

export function getFavoriteProducts(): Product[] {
  return findCatalogProductsByIds(favoriteIdsCache);
}

export function favoriteCountLabel(count: number) {
  return productCountLabel(count);
}

export function clearFavoritesCache() {
  favoriteIdsCache = [];
  hydrated = false;
  toggleSeqById.clear();
  notify();
}
