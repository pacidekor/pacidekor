/**
 * Category/subcategory helpers for admin + storefront filters.
 * Source of truth is Supabase (hydrated into taxonomy-store snapshot).
 */
import { categoryList, toSlug } from "@/lib/navigation";
import {
  getSubcategoriesForCategory,
  getSubcategoryById as getSeedSubcategoryById,
} from "@/lib/taxonomy";
import type {
  TaxonomyCategory,
  TaxonomyDruh,
  TaxonomyStore,
  TaxonomySubcategory,
} from "@/lib/taxonomy-types";
import {
  ADMIN_CATEGORIES_EVENT,
  ADMIN_CATEGORIES_STORAGE_KEY,
  getTaxonomySnapshot,
  setTaxonomySnapshot,
} from "@/lib/taxonomy-store";

export {
  ADMIN_CATEGORIES_EVENT,
  ADMIN_CATEGORIES_STORAGE_KEY,
  getTaxonomySnapshot,
  setTaxonomySnapshot,
};

export type AdminCategory = TaxonomyCategory;
export type AdminSubcategory = TaxonomySubcategory;
export type AdminDruh = TaxonomyDruh;
export type AdminCategoriesStore = TaxonomyStore;

export function seedAdminCategoriesStore(): AdminCategoriesStore {
  return {
    categories: categoryList.map((category, index) => ({
      id: category.slug,
      label: category.label,
      image: category.image,
      description: category.description,
      sortOrder: index,
    })),
    subcategories: [],
    druhy: [],
  };
}

export function readAdminCategoriesStore(): AdminCategoriesStore {
  const snapshot = getTaxonomySnapshot();
  if (snapshot.categories.length > 0) return snapshot;
  return seedAdminCategoriesStore();
}

/** @deprecated writes go through server actions; kept for in-memory UI sync */
export function writeAdminCategoriesStore(store: AdminCategoriesStore) {
  setTaxonomySnapshot(store);
}

export function findAdminCategory(
  store: AdminCategoriesStore,
  categoryLabelOrSlug: string,
) {
  const needle = categoryLabelOrSlug.trim();
  if (!needle) return undefined;
  const slug = toSlug(needle);
  return store.categories.find(
    (category) =>
      category.label === needle ||
      category.id === needle ||
      category.id === slug,
  );
}

export function getAdminSubcategoriesForCategory(
  categoryLabel: string,
  store?: AdminCategoriesStore,
): { id: string; label: string }[] {
  const data = store ?? readAdminCategoriesStore();
  const category = findAdminCategory(data, categoryLabel);
  if (!category) {
    return getSubcategoriesForCategory(categoryLabel).map((sub) => ({
      id: sub.id,
      label: sub.label,
    }));
  }

  return data.subcategories
    .filter((sub) => sub.categoryId === category.id)
    .map((sub) => ({ id: sub.id, label: sub.label }));
}

export function getAdminDruhyForCategory(
  categoryLabel: string,
  store?: AdminCategoriesStore,
): { id: string; label: string }[] {
  const data = store ?? readAdminCategoriesStore();
  const category = findAdminCategory(data, categoryLabel);
  if (!category) return [];

  return (data.druhy ?? [])
    .filter((druh) => druh.categoryId === category.id)
    .map((druh) => ({ id: druh.id, label: druh.label }));
}

export function getAdminDruhById(
  id: string | undefined,
  store?: AdminCategoriesStore,
) {
  if (!id) return undefined;
  const data = store ?? readAdminCategoriesStore();
  const fromStore = (data.druhy ?? []).find((druh) => druh.id === id);
  if (!fromStore) return undefined;
  const category = data.categories.find(
    (item) => item.id === fromStore.categoryId,
  );
  return {
    id: fromStore.id,
    label: fromStore.label,
    category: category?.label ?? "",
  };
}

export function getAdminCategoryLabels(store?: AdminCategoriesStore): string[] {
  const data = store ?? readAdminCategoriesStore();
  if (data.categories.length === 0) {
    return categoryList.map((category) => category.label);
  }
  return data.categories.map((category) => category.label);
}

export function getAdminSubcategoryById(
  id: string | undefined,
  store?: AdminCategoriesStore,
) {
  if (!id) return undefined;
  const data = store ?? readAdminCategoriesStore();
  const fromStore = data.subcategories.find((sub) => sub.id === id);
  if (fromStore) {
    const category = data.categories.find(
      (item) => item.id === fromStore.categoryId,
    );
    return {
      id: fromStore.id,
      label: fromStore.label,
      category: category?.label ?? "",
    };
  }
  return getSeedSubcategoryById(id);
}
