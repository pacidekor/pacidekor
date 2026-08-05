"use client";

import {
  listFavoriteIdsAction,
  toggleFavoriteAction,
} from "@/lib/actions/favorites";
import type { Product } from "@/lib/products";
import { findCatalogProductsByIds } from "@/lib/product-catalog";

export const FAVORITES_EVENT = "pacidekor:favorites-changed";

let favoriteIdsCache: string[] = [];
let hydrated = false;

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

export async function toggleFavorite(productId: string): Promise<boolean> {
  const result = await toggleFavoriteAction(productId);
  if (!result.ok) {
    throw new Error(result.error);
  }
  setFavoriteIdsSnapshot(result.data.ids);
  return result.data.active;
}

export function getFavoriteProducts(): Product[] {
  return findCatalogProductsByIds(favoriteIdsCache);
}

export function favoriteCountLabel(count: number) {
  if (count === 1) return "1 produkt";
  if (count > 1 && count < 5) return `${count} produkty`;
  return `${count} produktov`;
}

export function clearFavoritesCache() {
  favoriteIdsCache = [];
  hydrated = false;
  notify();
}
