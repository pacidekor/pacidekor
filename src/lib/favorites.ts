import type { Product } from "@/lib/products";
import { findCatalogProductsByIds } from "@/lib/product-catalog";

export const FAVORITES_KEY = "pacidekor-favorites";
export const FAVORITES_EVENT = "pacidekor:favorites-changed";

function notify() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(FAVORITES_EVENT));
}

export function readFavoriteIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

export function isFavorite(productId: string): boolean {
  return readFavoriteIds().includes(productId);
}

export function toggleFavorite(productId: string): boolean {
  if (typeof window === "undefined") return false;
  const current = readFavoriteIds();
  const next = current.includes(productId)
    ? current.filter((id) => id !== productId)
    : [...current, productId];
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  notify();
  return next.includes(productId);
}

export function getFavoriteProducts(): Product[] {
  return findCatalogProductsByIds(readFavoriteIds());
}

export function favoriteCountLabel(count: number) {
  if (count === 1) return "1 produkt";
  if (count > 1 && count < 5) return `${count} produkty`;
  return `${count} produktov`;
}
