import "server-only";

import { revalidatePath } from "next/cache";
import { toSlug } from "@/lib/navigation";
import type {
  ProductActionResult,
  ProductUpsertInput,
} from "@/lib/product-action-types";
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
import { createAdminClient, createServiceClient } from "@/lib/supabase/server";
import type { ProductAttributes } from "@/lib/taxonomy";

async function requireAdmin() {
  const supabase = await createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false as const,
      error: "Nie ste prihlásený.",
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
    };
  }

  return { ok: true as const };
}

function revalidateProductPaths(slug?: string) {
  try {
    revalidatePath("/");
    revalidatePath("/produkty");
    revalidatePath("/novinky");
    revalidatePath("/akcia");
    revalidatePath("/vypredaj");
    revalidatePath("/admin");
    revalidatePath("/admin/produkty");
    revalidatePath("/kategorie", "layout");
    if (slug) {
      revalidatePath(`/produkt/${slug}`);
    }
  } catch (error) {
    console.error("revalidateProductPaths", error);
  }
}

async function uniqueSlug(
  supabase: ReturnType<typeof createServiceClient>,
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
    druh_id: input.druhId || null,
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
    in_vypredaj: Boolean(input.inVypredaj),
    is_bestseller: Boolean(input.isBestseller),
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
    druh_id: input.druhId || null,
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

  payload.in_vypredaj = Boolean(input.inVypredaj);
  payload.is_bestseller = Boolean(input.isBestseller);

  return payload;
}

export async function upsertProductAdmin(
  input: ProductUpsertInput,
): Promise<ProductActionResult<Product>> {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return { ok: false, error: auth.error };

    if (!input.name.trim()) {
      return { ok: false, error: "Zadajte názov produktu." };
    }
    if (!input.images.some((src) => src.trim())) {
      return { ok: false, error: "Nahrajte aspoň jeden obrázok." };
    }

    const db = createServiceClient();
    const slug = await uniqueSlug(db, toSlug(input.name), input.id);

    if (input.id) {
      const { data: existing } = await db
        .from("products")
        .select("is_new, new_until")
        .eq("id", input.id)
        .maybeSingle();

      const updatePayload = toUpdatePayload(
        input,
        slug,
        (existing as Pick<ProductRow, "is_new" | "new_until"> | null) ?? null,
      );
      const { data, error } = await db
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
    const { data, error } = await db
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
  } catch (error) {
    console.error("upsertProductAdmin", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Uloženie produktu zlyhalo. Skúste to znova.",
    };
  }
}

function storagePathFromPublicUrl(url: string) {
  const marker = "/storage/v1/object/public/product-images/";
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length));
}

export async function deleteProductAdmin(
  productId: string,
): Promise<ProductActionResult> {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return { ok: false, error: auth.error };

    const db = createServiceClient();
    const { data: existing } = await db
      .from("products")
      .select("slug, images")
      .eq("id", productId)
      .maybeSingle();

    const { error } = await db.from("products").delete().eq("id", productId);

    if (error) {
      return { ok: false, error: error.message };
    }

    const images = (existing?.images as string[] | null) ?? [];
    const paths = images
      .map((url) => storagePathFromPublicUrl(url))
      .filter((path): path is string => Boolean(path));

    if (paths.length > 0) {
      await db.storage.from("product-images").remove(paths);
    }

    revalidateProductPaths(existing?.slug ?? undefined);
    return { ok: true, data: undefined };
  } catch (error) {
    console.error("deleteProductAdmin", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Vymazanie produktu zlyhalo. Skúste to znova.",
    };
  }
}
