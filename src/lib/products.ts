import type { ProductAttributes, TaxonomyValue } from "@/lib/taxonomy";
import { filterColors, getFilterColorById } from "@/lib/taxonomy";
import type {
  PackagingJson,
  ProductDetailJson,
  ProductRow,
} from "@/lib/supabase/database.types";

export type ProductDetail = {
  title: string;
  content: string;
};

export type ProductColor = {
  id: string;
  label: string;
  hex: string;
  /** Second half for split / dual-tone swatches (e.g. pink–white). */
  hexSecondary?: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** Interný / katalógový kód produktu (čísla a písmená) */
  sku?: string;
  price: string;
  originalPrice?: string;
  discount?: number;
  image: string;
  hoverImage?: string;
  extraImages?: string[];
  category: string;
  subcategoryId?: string;
  druhId?: string;
  attributes?: ProductAttributes;
  colors?: ProductColor[];
  /** colorId → 0-based indexes into getProductGallery(product) */
  colorImageMap?: Record<string, number[]>;
  details: ProductDetail[];
  /** Seed availability – live stock is tracked in inventory storage. */
  inStock?: boolean;
  stockQuantity?: number;
  /** Admin-controlled novinka flag (must also pass newUntil). */
  isNew?: boolean;
  /** ISO timestamp – novinka visible while now < newUntil. */
  newUntil?: string;
  /** Admin flag: listed on /vypredaj (can still have an Akcia discount). */
  inVypredaj?: boolean;
  createdAt?: string;
};

/** Legacy per-product detail cards – storefront uses fixed purchase benefits instead. */
export const DEFAULT_PRODUCT_DETAILS: ProductDetail[] = [];

export function colorsFromIds(colorIds: string[] | null | undefined): ProductColor[] {
  if (!colorIds || colorIds.length === 0) return [];

  return colorIds.flatMap((id) => {
    const custom = parseCustomColorId(id);
    if (custom) return [custom];

    const color = getFilterColorById(id);
    if (!color?.hex) return [];
    return [{ id: color.id, label: color.label, hex: color.hex }];
  });
}

const CUSTOM_COLOR_PREFIX = "custom:";

export function isCustomColorId(id: string) {
  return id.startsWith(CUSTOM_COLOR_PREFIX);
}

export function encodeCustomColorId(
  hex: string,
  label: string,
  hexSecondary?: string,
) {
  const primary = normalizeHex(hex).slice(1);
  const secondary = hexSecondary
    ? normalizeHex(hexSecondary).slice(1)
    : null;
  const cleanLabel =
    label.trim() ||
    (secondary
      ? suggestSplitColorName(`#${primary}`, `#${secondary}`)
      : suggestColorName(`#${primary}`));
  const hexPart = secondary ? `${primary}-${secondary}` : primary;
  return `${CUSTOM_COLOR_PREFIX}${hexPart}:${encodeURIComponent(cleanLabel)}`;
}

export function parseCustomColorId(id: string): ProductColor | null {
  if (!isCustomColorId(id)) return null;
  const raw = id.slice(CUSTOM_COLOR_PREFIX.length);
  const sep = raw.indexOf(":");
  if (sep === -1) return null;
  const hexPart = raw.slice(0, sep);
  const labelPart = raw.slice(sep + 1);
  const label = decodeURIComponent(labelPart).trim();
  if (!label) return null;

  const splitMatch = /^([0-9a-fA-F]{6})-([0-9a-fA-F]{6})$/.exec(hexPart);
  if (splitMatch) {
    return {
      id,
      label,
      hex: `#${splitMatch[1]!.toLowerCase()}`,
      hexSecondary: `#${splitMatch[2]!.toLowerCase()}`,
    };
  }

  if (!/^[0-9a-fA-F]{6}$/.test(hexPart)) return null;
  return {
    id,
    label,
    hex: `#${hexPart.toLowerCase()}`,
  };
}

/** CSS for solid or vertical split swatches. */
export function colorSwatchStyle(
  color: Pick<ProductColor, "hex" | "hexSecondary">,
): { backgroundColor?: string; backgroundImage?: string } {
  if (color.hexSecondary) {
    return {
      backgroundImage: `linear-gradient(to right, ${color.hex} 50%, ${color.hexSecondary} 50%)`,
    };
  }
  return { backgroundColor: color.hex };
}

export function suggestSplitColorName(hex: string, _hexSecondary?: string) {
  // Split swatch stays visual-only — label is always the main (primary) color.
  return suggestColorName(hex);
}

export function normalizeHex(hex: string) {
  const value = hex.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(value)) {
    return `#${value
      .split("")
      .map((ch) => ch + ch)
      .join("")
      .toLowerCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(value)) {
    return `#${value.toLowerCase()}`;
  }
  return "#9a9a96";
}

function hexToRgb(hex: string): [number, number, number] {
  const raw = normalizeHex(hex).slice(1);
  return [
    Number.parseInt(raw.slice(0, 2), 16),
    Number.parseInt(raw.slice(2, 4), 16),
    Number.parseInt(raw.slice(4, 6), 16),
  ];
}

function hexToHsl(hex: string) {
  const [r8, g8, b8] = hexToRgb(hex);
  const r = r8 / 255;
  const g = g8 / 255;
  const b = b8 / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case r:
      h = (g - b) / d + (g < b ? 6 : 0);
      break;
    case g:
      h = (b - r) / d + 2;
      break;
    default:
      h = (r - g) / d + 4;
  }
  h /= 6;
  return { h: h * 360, s: s * 100, l: l * 100 };
}

type Hsl = { h: number; s: number; l: number };

function hslDistance(a: Hsl, b: Hsl) {
  let dh = Math.abs(a.h - b.h);
  if (dh > 180) dh = 360 - dh;
  // Hue only irrelevant when BOTH sides are near-gray
  const chromatic = Math.max(a.s, b.s);
  const hueWeight = chromatic < 18 ? 0.05 : chromatic < 35 ? 0.55 : 1;
  return Math.sqrt(
    (dh * hueWeight) ** 2 +
      ((a.s - b.s) * 0.5) ** 2 +
      ((a.l - b.l) * 1.05) ** 2,
  );
}

/**
 * Map any hex onto the basic filter palette (for search / category filters).
 * Near-black → Sivá (there is no Čierna filter chip).
 */
export function nearestFilterColor(hex: string): {
  color: TaxonomyValue;
  distance: number;
} {
  const clean = normalizeHex(hex);
  const sample = hexToHsl(clean);

  const byId = (id: string) =>
    filterColors.find((item) => item.id === id) ?? filterColors[0]!;

  // Near-black neutrals → Sivá, never Hnedá
  if (sample.l <= 18 && sample.s < 20) {
    return { color: byId("seda"), distance: 0 };
  }
  // Near white
  if (sample.l >= 92 && sample.s < 40) {
    return { color: byId("biela"), distance: 0 };
  }

  let best = filterColors[0]!;
  let bestDist = Number.POSITIVE_INFINITY;

  for (const color of filterColors) {
    if (!color.hex) continue;
    // Don't let mid/dark browns steal near-black-ish neutrals via distance alone —
    // handled above. Prefer Sivá over Hnedá for dark low-sat grays.
    const dist = hslDistance(sample, hexToHsl(color.hex));
    if (dist < bestDist) {
      bestDist = dist;
      best = color;
    }
  }

  // Extra guard: very dark low-sat still wrongly near Hnedá → Sivá
  if (
    best.id === "hneda" &&
    sample.s < 22 &&
    sample.l < 28
  ) {
    return { color: byId("seda"), distance: bestDist };
  }

  return { color: best, distance: bestDist };
}

/**
 * Suggested display name in the custom color picker.
 * Can say „Čierna“ without adding Čierna as a filter variant.
 */
export function suggestColorName(hex: string) {
  const sample = hexToHsl(normalizeHex(hex));
  if (sample.l <= 18 && sample.s < 20) return "Čierna";
  if (sample.l >= 92 && sample.s < 40) return "Biela";
  return nearestFilterColor(hex).color.label;
}

/**
 * Whether a product color id matches a catalog filter chip (e.g. fialova).
 * Custom shades (svetlo fialová…) count toward their nearest basic group.
 */
export function productColorMatchesFilter(
  productColorId: string,
  filterColorId: string,
) {
  if (productColorId === filterColorId) return true;
  if (isCustomColorId(filterColorId)) return false;
  const custom = parseCustomColorId(productColorId);
  if (!custom) return false;
  return nearestFilterColor(custom.hex).color.id === filterColorId;
}

/** Basic filter palette plus custom shades present in the given catalog slice. */
export function collectCatalogColorFilters(products: Product[]): TaxonomyValue[] {
  const customById = new Map<string, TaxonomyValue>();

  for (const product of products) {
    const ids =
      product.attributes?.colors ??
      product.colors?.map((color) => color.id) ??
      [];
    for (const id of ids) {
      const custom = parseCustomColorId(id);
      if (custom) {
        customById.set(custom.id, {
          id: custom.id,
          label: custom.label,
          hex: custom.hex,
        });
      }
    }
  }

  const customs = [...customById.values()].sort((a, b) =>
    a.label.localeCompare(b.label, "sk"),
  );

  return [...filterColors, ...customs];
}

/**
 * Pick the product color variant that matches active catalog color filters,
 * so grid previews can show e.g. the yellow photo when filtering by yellow.
 */
export function resolveProductColorForFilters(
  product: Product,
  filterColorIds: string[] | null | undefined,
): string | null {
  if (!filterColorIds?.length) return null;

  const productColors =
    product.colors && product.colors.length > 0
      ? product.colors
      : colorsFromIds(product.attributes?.colors);

  if (productColors.length === 0) return null;

  for (const filterId of filterColorIds) {
    const match = productColors.find((color) =>
      productColorMatchesFilter(color.id, filterId),
    );
    if (match) return match.id;
  }

  return null;
}

function asPackaging(value: unknown): PackagingJson[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as PackagingJson;
    if (typeof row.id !== "string" || typeof row.pieces !== "number") return [];
    return [
      {
        id: row.id,
        pieces: row.pieces,
        label: typeof row.label === "string" ? row.label : undefined,
      },
    ];
  });
}

function asDetails(value: unknown): ProductDetail[] {
  if (!Array.isArray(value) || value.length === 0) {
    return DEFAULT_PRODUCT_DETAILS;
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as ProductDetailJson;
    if (typeof row.title !== "string" || typeof row.content !== "string") {
      return [];
    }
    return [{ title: row.title, content: row.content }];
  });
}

export function mapProductRow(row: ProductRow): Product {
  const images = Array.isArray(row.images) ? row.images.filter(Boolean) : [];
  const [image = "", hoverImage, ...extraImages] = images;
  const colorIds = row.color_ids ?? [];
  const packaging = asPackaging(row.packaging);
  const colors = colorsFromIds(colorIds);
  const colorImageMap = asColorImageMap(row.color_image_map, images.length);

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? "",
    sku: row.sku ?? undefined,
    price: row.price,
    originalPrice: row.original_price ?? undefined,
    discount: row.discount ?? undefined,
    image,
    hoverImage,
    extraImages: extraImages.length > 0 ? extraImages : undefined,
    category: row.category,
    subcategoryId: row.subcategory_id ?? undefined,
    druhId: row.druh_id ?? undefined,
    attributes: {
      colors: colorIds.length > 0 ? colorIds : undefined,
      packaging: packaging.length > 0 ? packaging : undefined,
    },
    colors: colors.length > 0 ? colors : undefined,
    colorImageMap:
      colorImageMap && Object.keys(colorImageMap).length > 0
        ? colorImageMap
        : undefined,
    details: asDetails(row.details),
    inStock: row.in_stock,
    stockQuantity: row.stock_quantity ?? undefined,
    isNew: row.is_new,
    newUntil: row.new_until ?? undefined,
    inVypredaj: row.in_vypredaj,
    createdAt: row.created_at,
  };
}

function asColorImageMap(
  value: unknown,
  imageCount: number,
): Record<string, number[]> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const result: Record<string, number[]> = {};
  for (const [colorId, indexes] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (!Array.isArray(indexes)) continue;
    const cleaned = indexes
      .map((item) => Number(item))
      .filter(
        (item) =>
          Number.isInteger(item) && item >= 0 && item < imageCount,
      );
    if (cleaned.length > 0) {
      result[colorId] = Array.from(new Set(cleaned));
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

/** Evenly split gallery indexes across color IDs (ordered packs). */
export function buildEvenColorImageMap(
  colorIds: string[],
  imageCount: number,
): Record<string, number[]> {
  if (colorIds.length === 0 || imageCount <= 0) return {};

  const base = Math.floor(imageCount / colorIds.length);
  const remainder = imageCount % colorIds.length;
  const map: Record<string, number[]> = {};
  let cursor = 0;

  colorIds.forEach((colorId, index) => {
    const size = base + (index < remainder ? 1 : 0);
    const indexes: number[] = [];
    for (let i = 0; i < size; i += 1) {
      indexes.push(cursor + i);
    }
    map[colorId] = indexes;
    cursor += size;
  });

  return map;
}

export function resolveColorImageIndexes(
  product: Product,
  colorId: string,
): number[] {
  const gallery = getProductGallery(product);
  if (gallery.length === 0) return [];

  const colorIds =
    product.colors?.map((color) => color.id) ??
    product.attributes?.colors ??
    [];

  const explicit = product.colorImageMap?.[colorId];
  if (explicit && explicit.length > 0) {
    return explicit.filter((index) => index >= 0 && index < gallery.length);
  }

  if (colorIds.length === 0) return gallery.map((_, index) => index);

  const fallback = buildEvenColorImageMap(colorIds, gallery.length);
  return fallback[colorId] ?? [];
}

/** Selected color images first, then the rest of the gallery (no duplicates). */
export function getGalleryForColor(
  product: Product,
  colorId?: string,
): string[] {
  const gallery = getProductGallery(product);
  if (!colorId || gallery.length === 0) return gallery;

  const preferred = resolveColorImageIndexes(product, colorId);
  if (preferred.length === 0) return gallery;

  const preferredSet = new Set(preferred);
  const head = preferred
    .map((index) => gallery[index])
    .filter(Boolean);
  const tail = gallery.filter((_, index) => !preferredSet.has(index));
  return [...head, ...tail];
}

export function getColorPreviewImages(
  product: Product,
  colorId: string,
): { image: string; hoverImage?: string } {
  const gallery = getProductGallery(product);
  const indexes = resolveColorImageIndexes(product, colorId);
  const primary = gallery[indexes[0] ?? 0] ?? product.image;
  const secondary =
    gallery[indexes[1] ?? -1] ??
    (indexes.length > 0 ? undefined : product.hoverImage);

  return {
    image: primary,
    hoverImage: secondary && secondary !== primary ? secondary : undefined,
  };
}

export function getProductGallery(product: Product): string[] {
  return [
    product.image,
    ...(product.hoverImage ? [product.hoverImage] : []),
    ...(product.extraImages ?? []),
  ].filter(Boolean);
}

export function getRelatedProducts(
  allProducts: Product[],
  slug: string,
  count = 4,
) {
  const others = allProducts.filter((product) => product.slug !== slug);
  const start = allProducts.findIndex((product) => product.slug === slug);
  const offset = start >= 0 ? start % Math.max(others.length, 1) : 0;
  const related: Product[] = [];

  for (let i = 0; i < Math.min(count, others.length); i++) {
    related.push(others[(offset + i) % others.length]);
  }

  return related;
}

export function productHref(
  slug: string,
  options?: { colorId?: string | null },
) {
  const base = `/produkt/${slug}`;
  const colorId = options?.colorId?.trim();
  if (!colorId) return base;
  return `${base}?farba=${encodeURIComponent(colorId)}`;
}

/** Auth side panel product slide */
export type AuthSideSlide = {
  image: string;
  name: string;
  slug: string;
};

export function getProductsByCategory(
  allProducts: Product[],
  category: string,
) {
  return allProducts.filter((product) => product.category === category);
}

/** How long a product stays in Novinky after being marked. */
export const NEW_PRODUCT_DAYS = 60;

export function computeNewUntil(from: Date = new Date()): string {
  const date = new Date(from);
  date.setUTCDate(date.getUTCDate() + NEW_PRODUCT_DAYS);
  return date.toISOString();
}

export function isActiveNewProduct(
  product: Pick<Product, "isNew" | "newUntil">,
  now: number = Date.now(),
) {
  if (!product.isNew || !product.newUntil) return false;
  const until = new Date(product.newUntil).getTime();
  return Number.isFinite(until) && until > now;
}

/**
 * Active novinky only (flag + not expired).
 * Pass `count` to limit (homepage carousel); omit for full /novinky list.
 */
export function getNewestProducts(allProducts: Product[], count?: number) {
  const now = Date.now();
  const list = allProducts
    .filter((product) => isActiveNewProduct(product, now))
    .sort((a, b) => {
      const aTime = new Date(a.createdAt ?? a.newUntil ?? 0).getTime();
      const bTime = new Date(b.createdAt ?? b.newUntil ?? 0).getTime();
      return bTime - aTime;
    });

  return count != null ? list.slice(0, count) : list;
}

export function getVypredajProducts(allProducts: Product[]) {
  return allProducts.filter((product) => product.inVypredaj);
}

export function getSaleProducts(allProducts: Product[]) {
  return allProducts.filter(
    (product) => Boolean(product.originalPrice) || Boolean(product.discount),
  );
}

export type ProductFilterInput = {
  subcategoryId?: string;
  druhId?: string;
  /** Hlavné kategórie (label z product.category) */
  categories?: string[];
  colors?: string[];
};

export function filterProducts(
  list: Product[],
  filters: ProductFilterInput,
): Product[] {
  return list.filter((product) => {
    if (
      filters.subcategoryId &&
      product.subcategoryId !== filters.subcategoryId
    ) {
      return false;
    }

    if (filters.druhId && product.druhId !== filters.druhId) {
      return false;
    }

    if (filters.categories && filters.categories.length > 0) {
      if (!filters.categories.includes(product.category)) {
        return false;
      }
    }

    if (filters.colors && filters.colors.length > 0) {
      const productColors = product.attributes?.colors ?? [];
      const matchesColor = filters.colors.some((filterId) =>
        productColors.some((colorId) =>
          productColorMatchesFilter(colorId, filterId),
        ),
      );
      if (!matchesColor) return false;
    }

    return true;
  });
}

export function generateProductSku() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `PD-${code}`;
}
