"use client";

import type { TaxonomyStore } from "@/lib/taxonomy-types";

export const TAXONOMY_EVENT = "pacidekor:taxonomy-changed";
/** @deprecated kept so old storage listeners don't crash */
export const ADMIN_CATEGORIES_STORAGE_KEY = "pacidekor.admin.categories";
export const ADMIN_CATEGORIES_EVENT = TAXONOMY_EVENT;

const EMPTY_STORE: TaxonomyStore = {
  categories: [],
  subcategories: [],
  druhy: [],
};

let taxonomyCache: TaxonomyStore = EMPTY_STORE;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(TAXONOMY_EVENT));
  }
}

export function getTaxonomySnapshot(): TaxonomyStore {
  return taxonomyCache;
}

/** Sync cache without notifying listeners (safe during render / SSR). */
export function hydrateTaxonomySnapshot(next: TaxonomyStore) {
  taxonomyCache = next;
}

export function setTaxonomySnapshot(next: TaxonomyStore) {
  if (taxonomyCache === next) return;
  taxonomyCache = next;
  emit();
}

export function subscribeTaxonomy(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
