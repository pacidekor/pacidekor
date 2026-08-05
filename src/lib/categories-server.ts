import "server-only";

import type {
  CategoryRow,
  SubcategoryRow,
} from "@/lib/supabase/database.types";
import { createPublicClient } from "@/lib/supabase/server";
import type {
  TaxonomyCategory,
  TaxonomyStore,
  TaxonomySubcategory,
} from "@/lib/taxonomy-types";

export type { TaxonomyCategory, TaxonomyStore, TaxonomySubcategory };

export function mapCategoryRow(row: CategoryRow): TaxonomyCategory {
  return {
    id: row.id,
    label: row.label,
    image: row.image ?? undefined,
    description: row.description ?? undefined,
    sortOrder: row.sort_order,
  };
}

export function mapSubcategoryRow(row: SubcategoryRow): TaxonomySubcategory {
  return {
    id: row.id,
    label: row.label,
    categoryId: row.category_id,
    sortOrder: row.sort_order,
  };
}

export async function listTaxonomy(): Promise<TaxonomyStore> {
  const supabase = createPublicClient();
  const [categoriesRes, subcategoriesRes] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order", { ascending: true }),
    supabase
      .from("subcategories")
      .select("*")
      .order("sort_order", { ascending: true }),
  ]);

  if (categoriesRes.error) {
    console.error("listTaxonomy categories", categoriesRes.error.message);
  }
  if (subcategoriesRes.error) {
    console.error("listTaxonomy subcategories", subcategoriesRes.error.message);
  }

  return {
    categories: ((categoriesRes.data as CategoryRow[] | null) ?? []).map(
      mapCategoryRow,
    ),
    subcategories: ((subcategoriesRes.data as SubcategoryRow[] | null) ?? []).map(
      mapSubcategoryRow,
    ),
  };
}

export async function listSubcategoriesForCategoryId(categoryId: string) {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("subcategories")
    .select("*")
    .eq("category_id", categoryId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("listSubcategoriesForCategoryId", error.message);
    return [];
  }

  return ((data as SubcategoryRow[] | null) ?? []).map(mapSubcategoryRow);
}
