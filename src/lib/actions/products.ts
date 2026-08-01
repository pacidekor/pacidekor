"use server";

import { revalidatePath } from "next/cache";
import { compressProductImage } from "@/lib/compress-product-image";
import { toSlug } from "@/lib/navigation";
import {
  DEFAULT_PRODUCT_DETAILS,
  computeNewUntil,
  generateProductSku,
  isActiveNewProduct,
  mapProductRow,
  type Product,
} from "@/lib/products";
import type {
  PackagingJson,
  ProductInsert,
  ProductRow,
  ProductUpdate,
} from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import type { ProductAttributes } from "@/lib/taxonomy";

/** Raw upload ceiling (must stay under next.config serverActions.bodySizeLimit). */
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

export type ProductActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type ProductUpsertInput = {
  id?: string;
  name: string;
  description: string;
  sku?: string;
  price?: string;
  originalPrice?: string;
  discount?: number;
  category: string;
  subcategoryId?: string;
  attributes?: ProductAttributes;
  images: string[];
  colorImageMap?: Record<string, number[]>;
  inStock: boolean;
  stockQuantity?: number | null;
  details?: Product["details"];
  /** When true, product appears in Novinky until new_until. */
  markAsNew?: boolean;
};

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false as const,
      error: "Nie ste prihlásený.",
      supabase,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return {
      ok: false as const,
      error: "Nemáte oprávnenie administrátora.",
      supabase,
    };
  }

  return { ok: true as const, supabase, user };
}

function revalidateProductPaths(slug?: string) {
  revalidatePath("/");
  revalidatePath("/produkty");
  revalidatePath("/novinky");
  revalidatePath("/admin");
  revalidatePath("/admin/produkty");
  revalidatePath("/kategorie", "layout");
  if (slug) {
    revalidatePath(`/produkt/${slug}`);
  }
}

async function uniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  base: string,
  excludeId?: string,
) {
  const root = base || "novy-produkt";
  let slug = root;
  let suffix = 2;

  for (;;) {
    let query = supabase.from("products").select("id").eq("slug", slug);
    if (excludeId) {
      query = query.neq("id", excludeId);
    }
    const { data } = await query.maybeSingle();
    if (!data) return slug;
    slug = `${root}-${suffix}`;
    suffix += 1;
  }
}

function normalizePackaging(
  packaging: ProductAttributes["packaging"] | undefined,
): PackagingJson[] {
  if (!packaging || packaging.length === 0) return [];
  return packaging
    .map((item) => ({
      id: item.id,
      pieces: Math.max(0, Math.floor(Number(item.pieces) || 0)),
      label: item.label?.trim() || undefined,
    }))
    .filter((item) => item.pieces > 0);
}

function normalizeColorImageMap(
  value: Record<string, number[]> | undefined,
  imageCount: number,
  colorIds: string[],
): Record<string, number[]> {
  if (!value) return {};
  const colorSet = new Set(colorIds);
  const result: Record<string, number[]> = {};

  for (const [colorId, indexes] of Object.entries(value)) {
    if (!colorSet.has(colorId)) continue;
    const cleaned = indexes
      .map((item) => Math.floor(Number(item)))
      .filter(
        (item) =>
          Number.isInteger(item) && item >= 0 && item < imageCount,
      );
    if (cleaned.length > 0) {
      result[colorId] = Array.from(new Set(cleaned));
    }
  }

  return result;
}

function toInsertPayload(
  input: ProductUpsertInput,
  slug: string,
): ProductInsert {
  const colorIds = input.attributes?.colors ?? [];
  const packaging = normalizePackaging(input.attributes?.packaging);
  const images = input.images.map((src) => src.trim()).filter(Boolean);
  const markAsNew = input.markAsNew !== false;

  return {
    slug,
    name: input.name.trim(),
    description: input.description.trim(),
    sku: input.sku?.trim() || generateProductSku(),
    price: input.price?.trim() || "0,00 €",
    original_price: input.originalPrice?.trim() || null,
    discount: input.discount ?? null,
    category: input.category,
    subcategory_id: input.subcategoryId || null,
    color_ids: colorIds,
    color_image_map: normalizeColorImageMap(
      input.colorImageMap,
      images.length,
      colorIds,
    ),
    packaging,
    details: input.details ?? DEFAULT_PRODUCT_DETAILS,
    images,
    in_stock: input.inStock,
    stock_quantity: input.inStock
      ? (input.stockQuantity ?? null)
      : null,
    is_new: markAsNew,
    new_until: markAsNew ? computeNewUntil() : null,
  };
}

function toUpdatePayload(
  input: ProductUpsertInput,
  slug: string,
  existing: Pick<ProductRow, "is_new" | "new_until"> | null,
): ProductUpdate {
  const colorIds = input.attributes?.colors ?? [];
  const packaging = normalizePackaging(input.attributes?.packaging);
  const images = input.images.map((src) => src.trim()).filter(Boolean);
  const markAsNew = Boolean(input.markAsNew);

  const payload: ProductUpdate = {
    slug,
    name: input.name.trim(),
    description: input.description.trim(),
    sku: input.sku?.trim() || null,
    category: input.category,
    subcategory_id: input.subcategoryId || null,
    color_ids: colorIds,
    color_image_map: normalizeColorImageMap(
      input.colorImageMap,
      images.length,
      colorIds,
    ),
    packaging,
    images,
    in_stock: input.inStock,
    stock_quantity: input.inStock
      ? (input.stockQuantity ?? null)
      : null,
  };

  if (input.price?.trim()) payload.price = input.price.trim();
  if (input.originalPrice !== undefined) {
    payload.original_price = input.originalPrice?.trim() || null;
  }
  if (input.discount !== undefined) payload.discount = input.discount;
  if (input.details) payload.details = input.details;

  if (markAsNew) {
    payload.is_new = true;
    const stillActive = existing
      ? isActiveNewProduct({
          isNew: existing.is_new,
          newUntil: existing.new_until ?? undefined,
        })
      : false;
    if (!stillActive) {
      payload.new_until = computeNewUntil();
    }
  } else {
    payload.is_new = false;
    payload.new_until = null;
  }

  return payload;
}

export async function upsertProductAction(
  input: ProductUpsertInput,
): Promise<ProductActionResult<Product>> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  if (!input.name.trim()) {
    return { ok: false, error: "Zadajte názov produktu." };
  }
  if (!input.images.some((src) => src.trim())) {
    return { ok: false, error: "Nahrajte aspoň jeden obrázok." };
  }

  const slug = await uniqueSlug(
    auth.supabase,
    toSlug(input.name),
    input.id,
  );

  if (input.id) {
    const { data: existing } = await auth.supabase
      .from("products")
      .select("is_new, new_until")
      .eq("id", input.id)
      .maybeSingle();

    const updatePayload = toUpdatePayload(
      input,
      slug,
      (existing as Pick<ProductRow, "is_new" | "new_until"> | null) ?? null,
    );
    const { data, error } = await auth.supabase
      .from("products")
      .update(updatePayload)
      .eq("id", input.id)
      .select("*")
      .single();

    if (error || !data) {
      return {
        ok: false,
        error: error?.message || "Nepodarilo sa uložiť produkt.",
      };
    }

    const product = mapProductRow(data as ProductRow);
    revalidateProductPaths(product.slug);
    return { ok: true, data: product };
  }

  const payload = toInsertPayload(input, slug);
  const { data, error } = await auth.supabase
    .from("products")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message || "Nepodarilo sa vytvoriť produkt.",
    };
  }

  const product = mapProductRow(data as ProductRow);
  revalidateProductPaths(product.slug);
  return { ok: true, data: product };
}

export async function deleteProductAction(
  productId: string,
): Promise<ProductActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const { data: existing } = await auth.supabase
    .from("products")
    .select("slug, images")
    .eq("id", productId)
    .maybeSingle();

  const { error } = await auth.supabase
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) {
    return { ok: false, error: error.message };
  }

  const images = (existing?.images as string[] | null) ?? [];
  const paths = images
    .map((url) => storagePathFromPublicUrl(url))
    .filter((path): path is string => Boolean(path));

  if (paths.length > 0) {
    await auth.supabase.storage.from("product-images").remove(paths);
  }

  revalidateProductPaths(existing?.slug);
  return { ok: true, data: undefined };
}

export async function uploadProductImageAction(
  formData: FormData,
): Promise<ProductActionResult<{ url: string }>> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Chýba súbor obrázka." };
  }

  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "Nahrajte obrázok (JPG, PNG, WEBP…)." };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: "Obrázok je príliš veľký (max. 12 MB). Skúste menší súbor.",
    };
  }

  let compressed;
  try {
    compressed = await compressProductImage(
      new Uint8Array(await file.arrayBuffer()),
    );
  } catch {
    return {
      ok: false,
      error: "Obrázok sa nepodarilo spracovať. Skúste iný súbor.",
    };
  }

  const path = `${auth.user.id}/${crypto.randomUUID()}.${compressed.extension}`;

  const { error } = await auth.supabase.storage
    .from("product-images")
    .upload(path, compressed.buffer, {
      contentType: compressed.contentType,
      upsert: false,
      cacheControl: "31536000",
    });

  if (error) {
    return { ok: false, error: error.message };
  }

  const { data } = auth.supabase.storage
    .from("product-images")
    .getPublicUrl(path);

  return { ok: true, data: { url: data.publicUrl } };
}

function storagePathFromPublicUrl(url: string) {
  const marker = "/storage/v1/object/public/product-images/";
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length));
}
