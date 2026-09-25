import "server-only";

import { applyDiscountsToProducts } from "@/lib/discounts";
import { listDiscounts } from "@/lib/discounts-server";
import {
  mapProductRow,
  type AuthSideSlide,
  type Product,
} from "@/lib/products";
import { createPublicClient } from "@/lib/supabase/server";
import type { ProductRow } from "@/lib/supabase/database.types";

export type { AuthSideSlide };

/** Full rows — storefront / PDP / full editor. */
export async function listProducts(): Promise<Product[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listProducts:", error.message);
    return [];
  }

  return (data as ProductRow[]).map(mapProductRow);
}

/**
 * Admin list / dashboard — skips heavy text fields (description, details, color maps).
 * Open editor → getProductById for full row.
 */
const ADMIN_LIST_COLUMNS =
  "id, slug, name, sku, price, original_price, discount, category, subcategory_id, druh_id, color_ids, packaging, images, in_stock, stock_quantity, is_new, new_until, in_vypredaj, is_bestseller, created_at, updated_at";

export async function listProductsForAdmin(): Promise<Product[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(ADMIN_LIST_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listProductsForAdmin:", error.message);
    return [];
  }

  return ((data as Partial<ProductRow>[] | null) ?? []).map((row) => {
    const images = Array.isArray(row.images) ? row.images.filter(Boolean) : [];
    return mapProductRow({
      description: "",
      details: [],
      color_image_map: {},
      ...row,
      // List thumb only — full gallery loads with getProductById on edit.
      images: images.slice(0, 1),
    } as ProductRow);
  });
}

/** Katalog s aplikovanými aktívnymi zľavami (cena, originalPrice, discount %). */
export async function listPricedProducts(): Promise<Product[]> {
  const [products, discounts] = await Promise.all([
    listProducts(),
    listDiscounts(),
  ]);
  return applyDiscountsToProducts(products, discounts);
}

export async function getProductBySlug(
  slug: string,
): Promise<Product | undefined> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("getProductBySlug:", error.message);
    return undefined;
  }

  return data ? mapProductRow(data as ProductRow) : undefined;
}

export async function getProductById(
  id: string,
): Promise<Product | undefined> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("getProductById:", error.message);
    return undefined;
  }

  return data ? mapProductRow(data as ProductRow) : undefined;
}

/** Unique main product slides for auth side panel slideshow. */
export async function listAuthSideSlides(limit = 16): Promise<AuthSideSlide[]> {
  const products = await listProducts();
  const ranked = [...products]
    .filter(
      (product) =>
        Boolean(product.image?.trim()) && Boolean(product.slug?.trim()),
    )
    .sort((a, b) => Number(Boolean(b.inStock)) - Number(Boolean(a.inStock)));

  const unique: AuthSideSlide[] = [];
  const seen = new Set<string>();
  for (const product of ranked) {
    const image = product.image.trim();
    if (seen.has(image)) continue;
    seen.add(image);
    unique.push({
      image,
      name: product.name.trim() || "Produkt",
      slug: product.slug.trim(),
    });
  }

  for (let i = unique.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = unique[i]!;
    unique[i] = unique[j]!;
    unique[j] = tmp;
  }

  return unique.slice(0, limit);
}

/** @deprecated use listAuthSideSlides */
export async function listAuthSideImages(limit = 16): Promise<string[]> {
  const slides = await listAuthSideSlides(limit);
  return slides.map((slide) => slide.image);
}
