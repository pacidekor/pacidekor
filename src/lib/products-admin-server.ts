import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";
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
import {
  collectReferencedImageUrls,
  storagePathsNotReferenced,
} from "@/lib/product-image-refs";
import {
  computeVariantSummary,
  derivedCatalogPriceFromSummary,
  discountIsPercentCompatible,
  normalizeTextVariants,
  pruneVariantImageUrls,
  type TextVariant,
  type VariantMode,
} from "@/lib/product-variants";
import { formatPrice, parsePrice } from "@/lib/price";
import { getDiscountStatus } from "@/lib/discounts";

/** Block custom mode while an absolute (non-percent) product discount is active or scheduled. */
async function assertNoAbsoluteDiscountConflict(
  db: ReturnType<typeof createServiceClient>,
  productId: string,
): Promise<string | null> {
  const { data, error } = await db
    .from("product_discounts")
    .select(
      "id, original_price, sale_price, discount_percent, active, starts_at, ends_at",
    )
    .eq("product_id", productId)
    .maybeSingle();
  if (error) {
    return `Nepodarilo sa overiť zľavu produktu (${error.message}).`;
  }
  if (!data) return null;

  const status = getDiscountStatus({
    id: data.id,
    productId,
    originalPrice: data.original_price,
    salePrice: data.sale_price,
    discountPercent: data.discount_percent,
    showOnAkciaPage: true,
    active: data.active,
    startsAt: data.starts_at ?? undefined,
    endsAt: data.ends_at ?? undefined,
    createdAt: "",
    updatedAt: "",
  });
  if (status !== "active" && status !== "scheduled") return null;

  if (
    discountIsPercentCompatible({
      originalPrice: data.original_price,
      salePrice: data.sale_price,
      discountPercent: data.discount_percent,
    })
  ) {
    return null;
  }

  return (
    "Produkt má aktívnu alebo naplánovanú absolútnu zľavu (sale price). " +
    "Pred prechodom na vlastné varianty ju upravte na percentuálnu, vypnite, " +
    "alebo odstráňte — zľavu automaticky nemažeme."
  );
}

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

function revalidateProductPaths(options?: {
  slug?: string;
  previousSlug?: string;
}) {
  try {
    // Storefront only — admin list updates from client state after save.
    revalidateTag("storefront-catalog", "max");
    // Product edits affect the home page, not the shared site layout (which
    // loads only taxonomy and discounts). Keep unrelated pages/layout cached.
    revalidatePath("/");
    revalidatePath("/produkty");
    revalidatePath("/novinky");
    revalidatePath("/akcia");
    revalidatePath("/vypredaj");
    revalidatePath("/bestsellery");
    revalidatePath("/kategorie", "layout");
    revalidatePath("/produkt", "layout");
    if (options?.slug) {
      revalidatePath(`/produkt/${options.slug}`);
    }
    if (
      options?.previousSlug &&
      options.previousSlug !== options.slug
    ) {
      revalidatePath(`/produkt/${options.previousSlug}`);
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

function normalizeUnavailableColorIds(
  unavailable: string[] | undefined,
  colorIds: string[],
): string[] {
  if (!Array.isArray(unavailable) || unavailable.length === 0) return [];
  const allowed = new Set(colorIds);
  const next: string[] = [];
  for (const id of unavailable) {
    if (typeof id !== "string" || !id.trim()) continue;
    if (allowed.has(id) && !next.includes(id)) next.push(id);
  }
  return next;
}

function resolveMode(input: ProductUpsertInput): VariantMode {
  if (input.variantMode === "custom") return "custom";
  if (input.variantMode === "colors") return "colors";
  if (input.variantMode === "none") return "none";
  const colors = input.attributes?.colors ?? [];
  return colors.length > 0 ? "colors" : "none";
}

function buildVariantFields(
  input: ProductUpsertInput,
  images: string[],
  existing?: Pick<
    ProductRow,
    "variant_mode" | "price" | "price_before_custom"
  > | null,
): {
  mode: VariantMode;
  variants: TextVariant[];
  axisLabel: string | null;
  defaultVariantId: string | null;
  price: string;
  priceBeforeCustom: string | null;
  summaryCounts: {
    variant_total_count: number;
    variant_orderable_count: number;
    variant_min_price_cents: number | null;
    variant_price_varies: boolean;
  };
  error?: string;
} {
  const mode = resolveMode(input);
  const axisLabel =
    mode === "custom" ? input.variantAxisLabel?.trim() || null : null;
  let variants =
    mode === "custom"
      ? pruneVariantImageUrls(
          normalizeTextVariants(input.textVariants ?? [], images),
          images,
        )
      : [];

  if (mode === "custom") {
    if (!axisLabel) {
      return {
        mode,
        variants,
        axisLabel,
        defaultVariantId: null,
        price: input.price?.trim() || "0,00 €",
        priceBeforeCustom: existing?.price_before_custom ?? null,
        summaryCounts: {
          variant_total_count: 0,
          variant_orderable_count: 0,
          variant_min_price_cents: null,
          variant_price_varies: false,
        },
        error: "Zadajte názov výberu (napr. Veľkosť).",
      };
    }
    if (variants.length === 0) {
      return {
        mode,
        variants,
        axisLabel,
        defaultVariantId: null,
        price: input.price?.trim() || "0,00 €",
        priceBeforeCustom: existing?.price_before_custom ?? null,
        summaryCounts: {
          variant_total_count: 0,
          variant_orderable_count: 0,
          variant_min_price_cents: null,
          variant_price_varies: false,
        },
        error: "Pridajte aspoň jednu vlastnú variantu.",
      };
    }
  }

  let defaultVariantId =
    mode === "custom" ? input.defaultVariantId?.trim() || null : null;
  if (
    defaultVariantId &&
    !variants.some((v) => v.id === defaultVariantId)
  ) {
    defaultVariantId = variants[0]?.id ?? null;
  } else if (mode === "custom" && !defaultVariantId && variants[0]) {
    defaultVariantId = variants[0].id;
  }

  const summary = computeVariantSummary(
    mode,
    variants,
    axisLabel,
    defaultVariantId,
  );

  const prevMode = isVariantModeSafe(existing?.variant_mode)
    ? existing!.variant_mode!
    : null;
  let priceBeforeCustom = existing?.price_before_custom ?? null;
  let price = input.price?.trim() || existing?.price || "0,00 €";

  if (mode === "custom") {
    if (prevMode !== "custom" && existing?.price) {
      priceBeforeCustom = existing.price;
    }
    const derived = derivedCatalogPriceFromSummary(summary);
    if (derived) price = derived;
  } else if (prevMode === "custom") {
    const explicit = input.priceAfterModeSwitch?.trim() || input.price?.trim();
    if (!explicit) {
      return {
        mode,
        variants,
        axisLabel,
        defaultVariantId,
        price,
        priceBeforeCustom,
        summaryCounts: {
          variant_total_count: summary.totalCount,
          variant_orderable_count: summary.orderableCount,
          variant_min_price_cents: summary.minPriceCents,
          variant_price_varies: summary.priceVaries,
        },
        error:
          "Pri opustení vlastných variant zadajte cenu bez DPH, ktorá bude platiť.",
      };
    }
    const parsed = parsePrice(explicit);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return {
        mode,
        variants,
        axisLabel,
        defaultVariantId,
        price,
        priceBeforeCustom,
        summaryCounts: {
          variant_total_count: summary.totalCount,
          variant_orderable_count: summary.orderableCount,
          variant_min_price_cents: summary.minPriceCents,
          variant_price_varies: summary.priceVaries,
        },
        error: "Neplatná cena po zmene režimu.",
      };
    }
    price = formatPrice(parsed);
    priceBeforeCustom = null;
  }

  return {
    mode,
    variants,
    axisLabel: mode === "custom" ? axisLabel : null,
    defaultVariantId: mode === "custom" ? defaultVariantId : null,
    price,
    priceBeforeCustom: mode === "custom" ? priceBeforeCustom : null,
    summaryCounts: {
      variant_total_count: mode === "custom" ? summary.totalCount : 0,
      variant_orderable_count: mode === "custom" ? summary.orderableCount : 0,
      variant_min_price_cents:
        mode === "custom" ? summary.minPriceCents : null,
      variant_price_varies: mode === "custom" ? summary.priceVaries : false,
    },
  };
}

function isVariantModeSafe(value: unknown): value is VariantMode {
  return value === "none" || value === "colors" || value === "custom";
}

function toInsertPayload(
  input: ProductUpsertInput,
  slug: string,
): ProductInsert | { error: string } {
  const colorIds = input.attributes?.colors ?? [];
  const packaging = normalizePackaging(input.attributes?.packaging);
  const images = input.images.map((src) => src.trim()).filter(Boolean);
  const markAsNew = input.markAsNew !== false;
  const variantFields = buildVariantFields(input, images, null);
  if (variantFields.error) return { error: variantFields.error };

  const mode = variantFields.mode;
  // Persist inactive text_variants only when provided on create in custom mode.
  const textVariantsJson =
    mode === "custom" ? variantFields.variants : input.textVariants ?? null;

  return {
    slug,
    name: input.name.trim(),
    description: input.description.trim(),
    sku: input.sku?.trim() || generateProductSku(),
    price: variantFields.price,
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
    unavailable_color_ids: normalizeUnavailableColorIds(
      input.unavailableColorIds,
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
    variant_mode: mode,
    variant_axis_label:
      mode === "custom" ? variantFields.axisLabel : input.variantAxisLabel ?? null,
    text_variants: textVariantsJson,
    default_variant_id:
      mode === "custom" ? variantFields.defaultVariantId : null,
    variant_total_count: variantFields.summaryCounts.variant_total_count,
    variant_orderable_count: variantFields.summaryCounts.variant_orderable_count,
    variant_min_price_cents: variantFields.summaryCounts.variant_min_price_cents,
    variant_price_varies: variantFields.summaryCounts.variant_price_varies,
    price_before_custom: variantFields.priceBeforeCustom,
  };
}

function toUpdatePayload(
  input: ProductUpsertInput,
  slug: string,
  existing: Pick<
    ProductRow,
    | "is_new"
    | "new_until"
    | "variant_mode"
    | "price"
    | "price_before_custom"
    | "text_variants"
    | "variant_axis_label"
  > | null,
): ProductUpdate | { error: string } {
  const colorIds = input.attributes?.colors ?? [];
  const packaging = normalizePackaging(input.attributes?.packaging);
  const images = input.images.map((src) => src.trim()).filter(Boolean);
  const markAsNew = Boolean(input.markAsNew);
  const variantFields = buildVariantFields(input, images, existing);
  if (variantFields.error) return { error: variantFields.error };

  const mode = variantFields.mode;
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
    unavailable_color_ids: normalizeUnavailableColorIds(
      input.unavailableColorIds,
      colorIds,
    ),
    packaging,
    images,
    in_stock: input.inStock,
    stock_quantity: input.inStock
      ? (input.stockQuantity ?? null)
      : null,
    variant_mode: mode,
    price: variantFields.price,
    price_before_custom: variantFields.priceBeforeCustom,
    variant_total_count: variantFields.summaryCounts.variant_total_count,
    variant_orderable_count:
      variantFields.summaryCounts.variant_orderable_count,
    variant_min_price_cents:
      variantFields.summaryCounts.variant_min_price_cents,
    variant_price_varies: variantFields.summaryCounts.variant_price_varies,
  };

  if (mode === "custom") {
    payload.text_variants = variantFields.variants;
    payload.variant_axis_label = variantFields.axisLabel;
    payload.default_variant_id = variantFields.defaultVariantId;
  } else {
    // Keep inactive text_variants / axis label in DB — only clear active pointers.
    payload.default_variant_id = null;
  }

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
        .select(
          "slug, is_new, new_until, variant_mode, price, price_before_custom, text_variants, variant_axis_label",
        )
        .eq("id", input.id)
        .maybeSingle();

      const previousSlug =
        (existing as Pick<ProductRow, "slug"> | null)?.slug ?? undefined;

      const mode = resolveMode(input);
      if (mode === "custom") {
        const discountBlock = await assertNoAbsoluteDiscountConflict(
          db,
          input.id,
        );
        if (discountBlock) return { ok: false, error: discountBlock };
      }

      const updatePayload = toUpdatePayload(
        input,
        slug,
        (existing as Pick<
          ProductRow,
          | "is_new"
          | "new_until"
          | "variant_mode"
          | "price"
          | "price_before_custom"
          | "text_variants"
          | "variant_axis_label"
        > | null) ?? null,
      );
      if ("error" in updatePayload) {
        return { ok: false, error: updatePayload.error };
      }
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
      revalidateProductPaths({
        slug: product.slug,
        previousSlug,
      });
      return { ok: true, data: product };
    }

    const payload = toInsertPayload(input, slug);
    if ("error" in payload) {
      return { ok: false, error: payload.error };
    }
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
    revalidateProductPaths({ slug: product.slug });
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

export async function deleteProductAdmin(
  productId: string,
): Promise<ProductActionResult> {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return { ok: false, error: auth.error };

    const db = createServiceClient();
    const { data: existing, error: loadError } = await db
      .from("products")
      .select("slug, images")
      .eq("id", productId)
      .maybeSingle();

    if (loadError) {
      return {
        ok: false,
        error: `Nepodarilo sa načítať produkt pred mazaním (${loadError.message}). Mazanie zrušené.`,
      };
    }

    const images = (existing?.images as string[] | null) ?? [];

    // Do not delete Storage objects still referenced by another product
    // (active or archived — e.g. after a merge copied source URLs onto the target).
    // Fail closed: any reference-read error / incomplete page → no delete at all.
    let urlsStillUsed = new Set<string>();
    if (images.length > 0) {
      const refs = await collectReferencedImageUrls(async (from, to) => {
        const page = await db
          .from("products")
          .select("id, images, shared_image_urls", { count: "exact" })
          .neq("id", productId)
          .order("id", { ascending: true })
          .range(from, to);
        return {
          data: page.data,
          error: page.error,
          total: typeof page.count === "number" ? page.count : null,
        };
      });
      if (!refs.ok) {
        return { ok: false, error: refs.error };
      }
      urlsStillUsed = refs.urls;
    }

    const { error } = await db.from("products").delete().eq("id", productId);

    if (error) {
      return { ok: false, error: error.message };
    }

    const paths = storagePathsNotReferenced(images, urlsStillUsed);

    if (paths.length > 0) {
      // Prefer R2 when media CDN is live; also attempt Supabase cleanup for
      // legacy objects still referenced by absolute supabase.co URLs.
      try {
        const { deleteProductImageKeys } = await import("@/lib/r2-product-images");
        await deleteProductImageKeys(paths);
      } catch {
        /* Vercel / no binding */
      }
      await db.storage.from("product-images").remove(paths);
    }

    revalidateProductPaths({
      slug: existing?.slug ?? undefined,
    });
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
