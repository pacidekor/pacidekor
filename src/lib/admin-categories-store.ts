/**
 * Shared admin categories/subcategories store (localStorage).
 * Used by AdminCategoriesManager and product editor so custom subs show up.
 */
import { categoryList, toSlug } from "@/lib/navigation";
import {
  getSubcategoriesForCategory,
  getSubcategoryById as getSeedSubcategoryById,
  subcategories as seedSubcategories,
} from "@/lib/taxonomy";

export const ADMIN_CATEGORIES_STORAGE_KEY = "pacidekor.admin.categories";
export const ADMIN_CATEGORIES_EVENT = "pacidekor:admin-categories-changed";

export type AdminCategory = {
  id: string;
  label: string;
  image?: string;
  description?: string;
};

export type AdminSubcategory = {
  id: string;
  label: string;
  categoryId: string;
};

export type AdminCategoriesStore = {
  categories: AdminCategory[];
  subcategories: AdminSubcategory[];
};

export function seedAdminCategoriesStore(): AdminCategoriesStore {
  return {
    categories: categoryList.map((category) => ({
      id: category.slug,
      label: category.label,
      image: category.image,
      description: category.description,
    })),
    subcategories: seedSubcategories.map((sub) => ({
      id: sub.id,
      label: sub.label,
      categoryId: toSlug(sub.category),
    })),
  };
}

export function readAdminCategoriesStore(): AdminCategoriesStore {
  if (typeof window === "undefined") return seedAdminCategoriesStore();
  try {
    const raw = window.localStorage.getItem(ADMIN_CATEGORIES_STORAGE_KEY);
    if (!raw) return seedAdminCategoriesStore();
    const parsed = JSON.parse(raw) as AdminCategoriesStore;
    if (
      !Array.isArray(parsed.categories) ||
      !Array.isArray(parsed.subcategories)
    ) {
      return seedAdminCategoriesStore();
    }
    return parsed;
  } catch {
    return seedAdminCategoriesStore();
  }
}

export function writeAdminCategoriesStore(store: AdminCategoriesStore) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    ADMIN_CATEGORIES_STORAGE_KEY,
    JSON.stringify(store),
  );
  window.dispatchEvent(new Event(ADMIN_CATEGORIES_EVENT));
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

/** Subcategories for a product category label (admin store, seed fallback). */
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
    const category = data.categories.find((item) => item.id === fromStore.categoryId);
    return {
      id: fromStore.id,
      label: fromStore.label,
      category: category?.label ?? "",
    };
  }
  return getSeedSubcategoryById(id);
}
