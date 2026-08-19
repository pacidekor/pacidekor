"use client";

import { createCustomerClient } from "@/lib/supabase/client";
import {
  listFavoriteIdsAction,
  toggleFavoriteAction,
} from "@/lib/actions/favorites";
import type { Product } from "@/lib/products";
import { findCatalogProductsByIds } from "@/lib/product-catalog";
import { productCountLabel } from "@/lib/product-count";

export const FAVORITES_EVENT = "pacidekor:favorites-changed";

const FAVORITES_STORAGE_KEY = "pacidekor.favorites.v1";

let favoriteIdsCache: string[] = [];
let hydrated = false;
let cachedUserId: string | null = null;
/** Per-product toggle generation — ignores stale server responses. */
const toggleSeqById = new Map<string, number>();

function notify() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(FAVORITES_EVENT));
}

type StoredFavorites = {
  userId: string;
  ids: string[];
};

function readStoredFavorites(userId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredFavorites;
    if (
      !parsed ||
      parsed.userId !== userId ||
      !Array.isArray(parsed.ids)
    ) {
      return [];
    }
    return parsed.ids.filter((id) => typeof id === "string");
  } catch {
    return [];
  }
}

function writeStoredFavorites(userId: string, ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    const payload: StoredFavorites = { userId, ids };
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

function clearStoredFavorites() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(FAVORITES_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function getFavoriteIdsSnapshot(): string[] {
  return favoriteIdsCache;
}

export function isFavorite(productId: string): boolean {
  return favoriteIdsCache.includes(productId);
}

export function setFavoriteIdsSnapshot(ids: string[], userId?: string) {
  favoriteIdsCache = ids;
  hydrated = true;
  if (userId) cachedUserId = userId;
  if (cachedUserId) writeStoredFavorites(cachedUserId, ids);
  notify();
}

/**
 * Instant counter after hard refresh: session from cookie storage + last known ids.
 * Full reconcile still happens via hydrateFavorites().
 */
export async function bootstrapFavoritesPreview(): Promise<void> {
  const supabase = createCustomerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return;

  cachedUserId = userId;
  const stored = readStoredFavorites(userId);
  if (stored.length === 0) return;
  if (favoriteIdsCache.length > 0) return;

  favoriteIdsCache = stored;
  notify();
}

export async function hydrateFavorites(): Promise<string[]> {
  const supabase = createCustomerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (userId) {
    cachedUserId = userId;
    if (favoriteIdsCache.length === 0) {
      const stored = readStoredFavorites(userId);
      if (stored.length > 0) {
        favoriteIdsCache = stored;
        notify();
      }
    }
  }

  const result = await listFavoriteIdsAction();
  if (!result.ok) {
    favoriteIdsCache = [];
    hydrated = true;
    clearStoredFavorites();
    notify();
    return [];
  }
  setFavoriteIdsSnapshot(result.data, userId);
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
  cachedUserId = null;
  toggleSeqById.clear();
  clearStoredFavorites();
  notify();
}
