import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";
import {
  applyDiscountToProduct,
  applyDiscountsToProducts,
  getAkciaProductIds,
  type ProductDiscount,
} from "@/lib/discounts";
import { listDiscounts, mapDiscountRow } from "@/lib/discounts-server";
import { listTaxonomy } from "@/lib/categories-server";
import { isArchiveSchemaMissing } from "@/lib/product-archive-schema";
import {
  filterProducts,
  getBestsellerProducts,
  getNewestProducts,
  getRelatedProducts,
  isProductArchived,
  mapProductRow,
  productColorMatchesFilter,
  type AuthSideSlide,
  type Product,
} from "@/lib/products";
import type { StorefrontCollection } from "@/lib/produkty-url";
import { filterProductsBySearchQuery } from "@/lib/search";
import { createPublicClient } from "@/lib/supabase/server";
import type { ProductRow } from "@/lib/supabase/database.types";

export type { AuthSideSlide };
export type { StorefrontCollection };

export const STOREFRONT_CATALOG_TAG = "storefront-catalog";

/**
 * Storefront catalog cards / nav / related — skips heavy text (description, details).
 * Full row still comes from getProductBySlug / getProductById on PDP & admin editor.
 */
const STOREFRONT_LIST_COLUMNS_CORE =
  "id, slug, name, sku, price, original_price, discount, category, subcategory_id, druh_id, color_ids, color_image_map, unavailable_color_ids, color_stock, packaging, images, in_stock, stock_quantity, is_new, new_until, in_vypredaj, is_bestseller, created_at, updated_at";

const STOREFRONT_VARIANT_SUMMARY_COLUMNS =
  "variant_mode, variant_axis_label, variant_total_count, variant_orderable_count, variant_min_price_cents, variant_price_varies, default_variant_id";

/** List payload: summary only — never full text_variants. */
const STOREFRONT_LIST_COLUMNS_BASE = `${STOREFRONT_LIST_COLUMNS_CORE}, ${STOREFRONT_VARIANT_SUMMARY_COLUMNS}`;

const STOREFRONT_LIST_COLUMNS = `${STOREFRONT_LIST_COLUMNS_BASE}, archived_at, redirect_to_product_id`;

function isVariantSchemaMissing(message: string | undefined) {
  const m = (message ?? "").toLowerCase();
  return (
    m.includes("variant_mode") ||
    m.includes("text_variants") ||
    m.includes("variant_total_count") ||
    m.includes("line_option_key")
  );
}

/** Public catalog: only live (non-archived) rows. */
function notArchivedQuery<T extends { is: (col: string, val: null) => T }>(
  query: T,
): T {
  return query.is("archived_at", null);
}

function mapStorefrontListRow(row: Partial<ProductRow>): Product {
  return mapProductRow({
    description: "",
    details: [],
    color_image_map: {},
    ...row,
  } as ProductRow);
}

async function fetchStorefrontProducts(): Promise<Product[]> {
  const supabase = createPublicClient();
  const primary = await notArchivedQuery(
    supabase
      .from("products")
      .select(STOREFRONT_LIST_COLUMNS)
      .order("created_at", { ascending: false }),
  );

  if (!primary.error) {
    return ((primary.data as Partial<ProductRow>[] | null) ?? []).map(
      mapStorefrontListRow,
    );
  }

  if (
    !isArchiveSchemaMissing(primary.error.message) &&
    !isVariantSchemaMissing(primary.error.message)
  ) {
    console.error("listProducts:", primary.error.message);
    return [];
  }

  // Pre-migration: retry without variant and/or archive columns.
  const legacy = await supabase
    .from("products")
    .select(STOREFRONT_LIST_COLUMNS_CORE)
    .order("created_at", { ascending: false });

  if (legacy.error) {
    console.error("listProducts:", legacy.error.message);
    return [];
  }

  return ((legacy.data as Partial<ProductRow>[] | null) ?? []).map(
    mapStorefrontListRow,
  );
}

/** Cross-request cache for API routes / search (Hobby-friendly, 120s). */
export const listProductsUnstable = unstable_cache(
  fetchStorefrontProducts,
  ["storefront-products-v2"],
  { revalidate: 120, tags: [STOREFRONT_CATALOG_TAG] },
);

/** Full catalog for storefront — request-deduped via React.cache. */
export const listProducts = cache(async (): Promise<Product[]> => {
  return fetchStorefrontProducts();
});

/**
 * Admin list / dashboard — skips heavy text fields (description, details, color maps).
 * Open editor → getProductById for full row.
 */
const ADMIN_LIST_COLUMNS_BASE =
  "id, slug, name, sku, price, original_price, discount, category, subcategory_id, druh_id, color_ids, unavailable_color_ids, color_stock, packaging, images, in_stock, stock_quantity, is_new, new_until, in_vypredaj, is_bestseller, created_at, updated_at, variant_mode, variant_axis_label, text_variants, variant_total_count, variant_orderable_count, default_variant_id";

const ADMIN_LIST_COLUMNS = `${ADMIN_LIST_COLUMNS_BASE}, archived_at, redirect_to_product_id`;

export async function listProductsForAdmin(): Promise<Product[]> {
  const supabase = createPublicClient();
  // Admin must see archived rows (no archived_at filter).
  let data: Partial<ProductRow>[] | null = null;
  const primary = await supabase
    .from("products")
    .select(ADMIN_LIST_COLUMNS)
    .order("created_at", { ascending: false });

  if (primary.error && isArchiveSchemaMissing(primary.error.message)) {
    const legacy = await supabase
      .from("products")
      .select(ADMIN_LIST_COLUMNS_BASE)
      .order("created_at", { ascending: false });
    if (legacy.error) {
      console.error("listProductsForAdmin:", legacy.error.message);
      return [];
    }
    data = legacy.data as Partial<ProductRow>[] | null;
  } else if (primary.error) {
    console.error("listProductsForAdmin:", primary.error.message);
    return [];
  } else {
    data = primary.data as Partial<ProductRow>[] | null;
  }

  return (data ?? []).map((row) => {
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
export const listPricedProducts = cache(async (): Promise<Product[]> => {
  const [products, discounts] = await Promise.all([
    listProducts(),
    listDiscounts(),
  ]);
  return applyDiscountsToProducts(products, discounts);
});

export const listPricedProductsUnstable = unstable_cache(
  async () => {
    const products = await listProductsUnstable();
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("product_discounts")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) {
      console.error("listPricedProductsUnstable discounts:", error.message);
      return products;
    }
    const discounts = (
      (data as import("@/lib/supabase/database.types").ProductDiscountRow[] | null) ??
      []
    ).map(mapDiscountRow);
    return applyDiscountsToProducts(products, discounts);
  },
  ["storefront-priced-v2"],
  { revalidate: 120, tags: [STOREFRONT_CATALOG_TAG] },
);

/** Lean fetch for cart / favorites resolution (max 100 ids). */
/** Cart / by-ids: include full text_variants for custom selection + pricing. */
const STOREFRONT_BY_IDS_COLUMNS = `${STOREFRONT_LIST_COLUMNS}, text_variants, price_before_custom`;

export async function listPricedProductsByIds(
  ids: string[],
): Promise<Product[]> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(
    0,
    100,
  );
  if (unique.length === 0) return [];

  const supabase = createPublicClient();
  const primary = await notArchivedQuery(
    supabase
      .from("products")
      .select(STOREFRONT_BY_IDS_COLUMNS)
      .in("id", unique),
  );

  let rows: Partial<ProductRow>[] | null = null;
  if (!primary.error) {
    rows = primary.data as Partial<ProductRow>[] | null;
  } else if (
    isArchiveSchemaMissing(primary.error.message) ||
    isVariantSchemaMissing(primary.error.message)
  ) {
    const legacy = await supabase
      .from("products")
      .select(STOREFRONT_LIST_COLUMNS_CORE)
      .in("id", unique);
    if (legacy.error) {
      console.error("listPricedProductsByIds:", legacy.error.message);
      return [];
    }
    rows = legacy.data as Partial<ProductRow>[] | null;
  } else {
    console.error("listPricedProductsByIds:", primary.error.message);
    return [];
  }

  const products = (rows ?? []).map(mapStorefrontListRow);
  const discounts = await listDiscounts();
  return applyDiscountsToProducts(products, discounts);
}

export type StorefrontProductIndexRow = {
  id: string;
  category: string;
  colorIds: string[];
  createdAt: string;
  subcategoryId: string | null;
  druhId: string | null;
  isNew: boolean;
  newUntil: string | null;
  inVypredaj: boolean;
  isBestseller: boolean;
};

export type StorefrontListFilters = {
  category?: string;
  subcategoryId?: string;
  druhId?: string;
  colors?: string[];
  collection?: StorefrontCollection;
  /** Full-text search — matched server-side; only the page is returned to clients. */
  q?: string;
};

export type StorefrontListPage = {
  products: Product[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
};

/** Slim catalog index for filter/sort + pagination (not full card payload). */
const INDEX_COLUMNS_BASE =
  "id, category, color_ids, created_at, subcategory_id, druh_id, is_new, new_until, in_vypredaj, is_bestseller";

export const listStorefrontProductIndex = unstable_cache(
  async (): Promise<StorefrontProductIndexRow[]> => {
    const supabase = createPublicClient();
    const primary = await notArchivedQuery(
      supabase
        .from("products")
        .select(`${INDEX_COLUMNS_BASE}, archived_at`)
        .order("created_at", { ascending: false }),
    );

    let data: Partial<ProductRow>[] | null = null;
    if (!primary.error) {
      data = primary.data as Partial<ProductRow>[] | null;
    } else if (isArchiveSchemaMissing(primary.error.message)) {
      const legacy = await supabase
        .from("products")
        .select(INDEX_COLUMNS_BASE)
        .order("created_at", { ascending: false });
      if (legacy.error) {
        console.error("listStorefrontProductIndex:", legacy.error.message);
        return [];
      }
      data = legacy.data as Partial<ProductRow>[] | null;
    } else {
      console.error("listStorefrontProductIndex:", primary.error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
      id: String(row.id ?? ""),
      category: String(row.category ?? ""),
      colorIds: Array.isArray(row.color_ids)
        ? row.color_ids.filter((id): id is string => typeof id === "string")
        : [],
      createdAt: String(row.created_at ?? ""),
      subcategoryId:
        typeof row.subcategory_id === "string" ? row.subcategory_id : null,
      druhId: typeof row.druh_id === "string" ? row.druh_id : null,
      isNew: Boolean(row.is_new),
      newUntil: row.new_until ? String(row.new_until) : null,
      inVypredaj: Boolean(row.in_vypredaj),
      isBestseller: Boolean(row.is_bestseller),
    }));
  },
  ["storefront-product-index-v3"],
  { revalidate: 120, tags: [STOREFRONT_CATALOG_TAG] },
);

function isActiveNewIndexRow(
  row: StorefrontProductIndexRow,
  now = Date.now(),
) {
  if (!row.isNew || !row.newUntil) return false;
  const until = new Date(row.newUntil).getTime();
  return Number.isFinite(until) && until > now;
}

function filterProductIndex(
  index: StorefrontProductIndexRow[],
  filters: StorefrontListFilters,
  akciaIds?: Set<string>,
) {
  return index.filter((row) => {
    if (filters.category && row.category !== filters.category) return false;
    if (
      filters.subcategoryId &&
      row.subcategoryId !== filters.subcategoryId
    ) {
      return false;
    }
    if (filters.druhId && row.druhId !== filters.druhId) return false;
    if (filters.colors && filters.colors.length > 0) {
      const ok = filters.colors.some((filterId) =>
        row.colorIds.some((colorId) =>
          productColorMatchesFilter(colorId, filterId),
        ),
      );
      if (!ok) return false;
    }
    switch (filters.collection) {
      case "novinky":
        if (!isActiveNewIndexRow(row)) return false;
        break;
      case "bestsellery":
        if (!row.isBestseller) return false;
        break;
      case "vypredaj":
        if (!row.inVypredaj) return false;
        break;
      case "akcia":
        if (!akciaIds?.has(row.id)) return false;
        break;
      default:
        break;
    }
    return true;
  });
}

/**
 * Paginated storefront list — index filter in memory, full rows only for the page.
 * Stable order: created_at desc (catalog index). Akcia keeps discount-list order.
 * Search (`q`): ranks over server-cached catalog; only the page is returned.
 */
export async function listPricedProductsPage(options: {
  filters?: StorefrontListFilters;
  offset?: number;
  limit?: number;
}): Promise<StorefrontListPage> {
  const limit = Math.min(Math.max(options.limit ?? 24, 1), 48);
  const offset = Math.max(options.offset ?? 0, 0);
  const filters = options.filters ?? {};
  const q = filters.q?.trim() ?? "";

  if (q) {
    const [all, taxonomy] = await Promise.all([
      listPricedProductsUnstable(),
      listTaxonomy(),
    ]);
    const druhLabels = Object.fromEntries(
      taxonomy.druhy.map((druh) => [druh.id, druh.label]),
    );
    let matched = filterProductsBySearchQuery(all, q, { druhLabels });
    matched = filterProducts(matched, {
      categories: filters.category ? [filters.category] : undefined,
      colors: filters.colors,
      subcategoryId: filters.subcategoryId,
      druhId: filters.druhId,
    });
    const total = matched.length;
    const products = matched.slice(offset, offset + limit);
    return {
      products,
      total,
      offset,
      limit,
      hasMore: offset + limit < total,
    };
  }

  const [index, discounts] = await Promise.all([
    listStorefrontProductIndex(),
    filters.collection === "akcia" ? listDiscounts() : Promise.resolve(null),
  ]);

  const akciaIds =
    filters.collection === "akcia" && discounts
      ? new Set(getAkciaProductIds(discounts))
      : undefined;

  let filtered = filterProductIndex(index, filters, akciaIds);

  if (filters.collection === "akcia" && discounts) {
    const order = new Map(
      getAkciaProductIds(discounts).map((id, i) => [id, i]),
    );
    filtered = [...filtered].sort(
      (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
    );
  }

  const total = filtered.length;
  const pageRows = filtered.slice(offset, offset + limit);
  const products = await listPricedProductsByIds(pageRows.map((row) => row.id));
  const byId = new Map(products.map((product) => [product.id, product]));
  const ordered = pageRows
    .map((row) => byId.get(row.id))
    .filter((product): product is Product => Boolean(product));

  return {
    products: ordered,
    total,
    offset,
    limit,
    hasMore: offset + limit < total,
  };
}

/** Category listing — DB filter instead of shipping the full catalog. */
export const listPricedProductsByCategory = cache(
  async (categoryLabel: string): Promise<Product[]> => {
    const supabase = createPublicClient();
    const primary = await notArchivedQuery(
      supabase
        .from("products")
        .select(STOREFRONT_LIST_COLUMNS)
        .eq("category", categoryLabel)
        .order("created_at", { ascending: false }),
    );

    let rows: Partial<ProductRow>[] | null = null;
    if (!primary.error) {
      rows = primary.data as Partial<ProductRow>[] | null;
    } else if (isArchiveSchemaMissing(primary.error.message)) {
      const legacy = await supabase
        .from("products")
        .select(STOREFRONT_LIST_COLUMNS_BASE)
        .eq("category", categoryLabel)
        .order("created_at", { ascending: false });
      if (legacy.error) {
        console.error("listPricedProductsByCategory:", legacy.error.message);
        return [];
      }
      rows = legacy.data as Partial<ProductRow>[] | null;
    } else {
      console.error("listPricedProductsByCategory:", primary.error.message);
      return [];
    }

    const products = (rows ?? []).map(mapStorefrontListRow);
    const discounts = await listDiscounts();
    return applyDiscountsToProducts(products, discounts);
  },
);

export function buildAkciaProducts(
  products: Product[],
  discounts: ProductDiscount[],
  limit?: number,
): Product[] {
  const byId = new Map(products.map((product) => [product.id, product]));
  const list = getAkciaProductIds(discounts)
    .map((id) => {
      const product = byId.get(id);
      if (!product) return null;
      return applyDiscountToProduct(product, discounts);
    })
    .filter((product): product is Product => Boolean(product));

  return limit != null ? list.slice(0, limit) : list;
}

/** Homepage carousels only — avoids serializing the full catalog to the page. */
export const listHomepageSectionProducts = cache(
  async (
    limit = 5,
  ): Promise<{
    newest: Product[];
    bestsellers: Product[];
    akcia: Product[];
  }> => {
    const [products, discounts] = await Promise.all([
      listProducts(),
      listDiscounts(),
    ]);
    const priced = applyDiscountsToProducts(products, discounts);
    return {
      newest: getNewestProducts(priced, limit),
      bestsellers: getBestsellerProducts(priced, limit),
      akcia: buildAkciaProducts(priced, discounts, limit),
    };
  },
);

/**
 * Raw slug lookup — includes archived rows (needed for redirect before notFound).
 */
export const getProductBySlug = cache(
  async (slug: string): Promise<Product | undefined> => {
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
  },
);

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

export type StorefrontSlugResolution =
  | { kind: "product"; product: Product }
  | {
      kind: "redirect";
      /** Temporary (307) for first merge activation; permanent later. */
      temporary: true;
      fromSlug: string;
      toSlug: string;
      toProductId: string;
    }
  | { kind: "not_found" };

/**
 * Resolve a public PDP slug: live product, temporary redirect to merge target,
 * or not_found. Looks up archived rows; never silently remaps cart/order ids.
 */
export async function resolveStorefrontProductBySlug(
  slug: string,
): Promise<StorefrontSlugResolution> {
  const product = await getProductBySlug(slug);
  if (!product) return { kind: "not_found" };

  if (!isProductArchived(product)) {
    return { kind: "product", product };
  }

  const targetId = product.redirectToProductId?.trim();
  if (!targetId) return { kind: "not_found" };

  const target = await getProductById(targetId);
  if (!target || isProductArchived(target) || !target.slug?.trim()) {
    return { kind: "not_found" };
  }

  return {
    kind: "redirect",
    temporary: true,
    fromSlug: slug,
    toSlug: target.slug,
    toProductId: target.id,
  };
}

/**
 * Related cards for PDP — same category only (smaller query than full catalog).
 */
export async function listRelatedProducts(
  slug: string,
  count = 4,
): Promise<Product[]> {
  const product = await getProductBySlug(slug);
  if (!product?.category) {
    const products = await listProducts();
    return getRelatedProducts(products, slug, count);
  }

  const supabase = createPublicClient();
  const primary = await notArchivedQuery(
    supabase
      .from("products")
      .select(STOREFRONT_LIST_COLUMNS)
      .eq("category", product.category)
      .order("created_at", { ascending: false })
      .limit(Math.max(count * 4, 24)),
  );

  let rows: Partial<ProductRow>[] | null = null;
  if (!primary.error) {
    rows = primary.data as Partial<ProductRow>[] | null;
  } else if (isArchiveSchemaMissing(primary.error.message)) {
    const legacy = await supabase
      .from("products")
      .select(STOREFRONT_LIST_COLUMNS_BASE)
      .eq("category", product.category)
      .order("created_at", { ascending: false })
      .limit(Math.max(count * 4, 24));
    if (legacy.error) {
      console.error("listRelatedProducts:", legacy.error.message);
      const products = await listProducts();
      return getRelatedProducts(products, slug, count);
    }
    rows = legacy.data as Partial<ProductRow>[] | null;
  } else {
    console.error("listRelatedProducts:", primary.error.message);
    const products = await listProducts();
    return getRelatedProducts(products, slug, count);
  }

  // Selection depends only on slug/order. Normalize galleries and variants only
  // for the cards we actually render, preserving the existing recommendation order.
  return getRelatedProducts(rows ?? [], slug, count).map(mapStorefrontListRow);
}

/** Auth slideshow: mostly flowers, occasional ceramics — never candles/grave goods. */
const AUTH_SIDE_PRIMARY_CATEGORY = "Umelé kvety";
const AUTH_SIDE_ACCENT_CATEGORY = "Keramika";
/** Share of slides that should be flowers (rest = ceramics). */
const AUTH_SIDE_FLOWER_RATIO = 0.82;
const AUTH_SIDE_EXCLUDED_NAME =
  /hrob|náhrob|nahrob|cintor|pohreb|sviečk|svieck|svíčk/i;

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}

function toAuthSideSlide(product: Product): AuthSideSlide | null {
  const image = product.image?.trim();
  const slug = product.slug?.trim();
  if (!image || !slug) return null;
  if (AUTH_SIDE_EXCLUDED_NAME.test(product.name)) return null;
  return {
    image,
    name: product.name.trim() || "Produkt",
    slug,
  };
}

function uniqueSlidesByImage(products: Product[]): AuthSideSlide[] {
  const ranked = [...products].sort(
    (a, b) => Number(Boolean(b.inStock)) - Number(Boolean(a.inStock)),
  );
  const unique: AuthSideSlide[] = [];
  const seen = new Set<string>();
  for (const product of ranked) {
    const slide = toAuthSideSlide(product);
    if (!slide || seen.has(slide.image)) continue;
    seen.add(slide.image);
    unique.push(slide);
  }
  return unique;
}

/** Unique main product slides for auth side panel slideshow. */
export async function listAuthSideSlides(limit = 16): Promise<AuthSideSlide[]> {
  const supabase = createPublicClient();
  const primary = await notArchivedQuery(
    supabase
      .from("products")
      .select(STOREFRONT_LIST_COLUMNS)
      .in("category", [AUTH_SIDE_PRIMARY_CATEGORY, AUTH_SIDE_ACCENT_CATEGORY])
      .order("created_at", { ascending: false }),
  );

  let products: Product[];
  if (!primary.error) {
    products = ((primary.data as Partial<ProductRow>[] | null) ?? []).map(
      mapStorefrontListRow,
    );
  } else if (isArchiveSchemaMissing(primary.error.message)) {
    const legacy = await supabase
      .from("products")
      .select(STOREFRONT_LIST_COLUMNS_BASE)
      .in("category", [AUTH_SIDE_PRIMARY_CATEGORY, AUTH_SIDE_ACCENT_CATEGORY])
      .order("created_at", { ascending: false });
    if (legacy.error) {
      console.error("listAuthSideSlides:", legacy.error.message);
      products = await listProducts();
    } else {
      products = ((legacy.data as Partial<ProductRow>[] | null) ?? []).map(
        mapStorefrontListRow,
      );
    }
  } else {
    console.error("listAuthSideSlides:", primary.error.message);
    products = await listProducts();
  }

  const flowers = uniqueSlidesByImage(
    products.filter((p) => p.category === AUTH_SIDE_PRIMARY_CATEGORY),
  );
  const ceramics = uniqueSlidesByImage(
    products.filter((p) => p.category === AUTH_SIDE_ACCENT_CATEGORY),
  );

  shuffleInPlace(flowers);
  shuffleInPlace(ceramics);

  const flowerCount = Math.min(
    flowers.length,
    Math.max(1, Math.round(limit * AUTH_SIDE_FLOWER_RATIO)),
  );
  const ceramicCount = Math.min(
    ceramics.length,
    Math.max(0, limit - flowerCount),
  );

  const picked = [
    ...flowers.slice(0, flowerCount),
    ...ceramics.slice(0, ceramicCount),
  ];

  // If ceramics ran short, top up with more flowers (and vice versa).
  if (picked.length < limit) {
    const used = new Set(picked.map((s) => s.image));
    for (const slide of [...flowers, ...ceramics]) {
      if (picked.length >= limit) break;
      if (used.has(slide.image)) continue;
      used.add(slide.image);
      picked.push(slide);
    }
  }

  return shuffleInPlace(picked).slice(0, limit);
}

/** @deprecated use listAuthSideSlides */
export async function listAuthSideImages(limit = 16): Promise<string[]> {
  const slides = await listAuthSideSlides(limit);
  return slides.map((slide) => slide.image);
}
