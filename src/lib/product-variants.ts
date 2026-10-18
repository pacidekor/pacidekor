/**
 * Custom text variants — pure helpers (safe for client + server + node:test).
 */

/** Local price helpers so this module stays runnable under node:test without path aliases. */
function parsePrice(price: string) {
  return Number.parseFloat(
    price.replace(/\s/g, "").replace("€", "").replace(",", "."),
  );
}

function formatPrice(value: number) {
  return `${value.toFixed(2).replace(".", ",")} €`;
}

export type VariantMode = "none" | "colors" | "custom";

export type TextVariant = {
  id: string;
  label: string;
  /** Wholesale net price in eurocents (integer). */
  priceCents: number;
  available: boolean;
  sortOrder: number;
  /** URLs that must belong to product.images */
  imageUrls: string[];
};

export type VariantCatalogSummary = {
  mode: VariantMode;
  /** All valid variants (including sold-out). */
  totalCount: number;
  /** available === true */
  orderableCount: number;
  /** Min relevant price in cents (orderable if any, else all valid). */
  minPriceCents: number | null;
  /** Whether relevant prices differ. */
  priceVaries: boolean;
  defaultVariantId: string | null;
  axisLabel: string | null;
};

export function isVariantMode(value: unknown): value is VariantMode {
  return value === "none" || value === "colors" || value === "custom";
}

export function eurosToCents(euros: number): number {
  if (!Number.isFinite(euros)) return 0;
  return Math.round(euros * 100);
}

export function centsToEuros(cents: number): number {
  if (!Number.isFinite(cents)) return 0;
  return cents / 100;
}

export function formatCentsAsPrice(cents: number): string {
  return formatPrice(centsToEuros(cents));
}

export function parsePriceToCents(price: string): number {
  return eurosToCents(parsePrice(price));
}

export function normalizeTextVariant(
  raw: unknown,
  productImageUrls: string[],
): TextVariant | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id.trim() : "";
  const label = typeof row.label === "string" ? row.label.trim() : "";
  if (!id || !label) return null;

  let priceCents = Number(row.priceCents);
  if (!Number.isInteger(priceCents) || priceCents < 0) {
    if (typeof row.price === "string") {
      priceCents = parsePriceToCents(row.price);
    } else {
      return null;
    }
  }

  const available = row.available !== false;
  const sortOrder = Number.isFinite(Number(row.sortOrder))
    ? Math.floor(Number(row.sortOrder))
    : 0;

  const allowed = new Set(productImageUrls);
  const imageUrls: string[] = [];
  const urlsRaw = Array.isArray(row.imageUrls)
    ? row.imageUrls
    : Array.isArray(row.image_urls)
      ? row.image_urls
      : [];
  for (const u of urlsRaw) {
    if (typeof u !== "string") continue;
    const url = u.trim();
    if (url && allowed.has(url) && !imageUrls.includes(url)) {
      imageUrls.push(url);
    }
  }

  return {
    id,
    label,
    priceCents,
    available,
    sortOrder,
    imageUrls,
  };
}

export function normalizeTextVariants(
  raw: unknown,
  productImageUrls: string[],
): TextVariant[] {
  if (!Array.isArray(raw)) return [];
  const out: TextVariant[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const v = normalizeTextVariant(item, productImageUrls);
    if (!v || seen.has(v.id)) continue;
    seen.add(v.id);
    out.push(v);
  }
  return out.sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "sk"));
}

/** Strip image URLs removed from the product gallery (same save). */
export function pruneVariantImageUrls(
  variants: TextVariant[],
  productImageUrls: string[],
): TextVariant[] {
  const allowed = new Set(productImageUrls);
  return variants.map((v) => ({
    ...v,
    imageUrls: v.imageUrls.filter((u) => allowed.has(u)),
  }));
}

export function computeVariantSummary(
  mode: VariantMode,
  variants: TextVariant[],
  axisLabel: string | null | undefined,
  defaultVariantId: string | null | undefined,
): VariantCatalogSummary {
  if (mode !== "custom") {
    return {
      mode,
      totalCount: 0,
      orderableCount: 0,
      minPriceCents: null,
      priceVaries: false,
      defaultVariantId: null,
      axisLabel: null,
    };
  }

  const valid = variants.filter((v) => v.id && v.label);
  const orderable = valid.filter((v) => v.available);
  const relevant = orderable.length > 0 ? orderable : valid;
  const prices = relevant.map((v) => v.priceCents);
  const minPriceCents =
    prices.length > 0 ? Math.min(...prices) : null;
  const priceVaries =
    prices.length > 1 && prices.some((p) => p !== prices[0]);

  let defaultId =
    typeof defaultVariantId === "string" && defaultVariantId.trim()
      ? defaultVariantId.trim()
      : null;
  if (defaultId && !valid.some((v) => v.id === defaultId)) {
    defaultId = null;
  }

  return {
    mode: "custom",
    totalCount: valid.length,
    orderableCount: orderable.length,
    minPriceCents,
    priceVaries,
    defaultVariantId: defaultId,
    axisLabel: axisLabel?.trim() || null,
  };
}

/** Derived catalog price string from summary (for products.price sync). */
export function derivedCatalogPriceFromSummary(
  summary: VariantCatalogSummary,
): string | null {
  if (summary.minPriceCents == null) return null;
  return formatCentsAsPrice(summary.minPriceCents);
}

export function firstOrderableVariant(
  variants: TextVariant[],
  defaultVariantId?: string | null,
): TextVariant | null {
  const orderable = variants.filter((v) => v.available);
  if (orderable.length === 0) return null;
  if (defaultVariantId) {
    const pref = orderable.find((v) => v.id === defaultVariantId);
    if (pref) return pref;
  }
  return orderable[0] ?? null;
}

export function findTextVariant(
  variants: TextVariant[] | undefined,
  variantId: string | null | undefined,
): TextVariant | null {
  const id = (variantId ?? "").trim();
  if (!id || !variants?.length) return null;
  return variants.find((v) => v.id === id) ?? null;
}

/** Slovak plural for catalog badge. */
/** Slovak plural for catalog badge; null when ≤1 (badge hidden). */
export function formatVariantCountLabel(totalCount: number): string | null {
  if (!Number.isFinite(totalCount) || totalCount <= 1) return null;
  const n = Math.floor(totalCount);
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
    return `${n} varianty`;
  }
  return `${n} variantov`;
}

/** Catalog/net price string for a text variant, with optional percent discount. */
export function catalogNetForTextVariant(
  priceCents: number,
  discountPercent?: number | null,
): string {
  if (typeof discountPercent === "number" && discountPercent > 0) {
    return formatCentsAsPrice(
      applyPercentToVariantNet(priceCents, discountPercent),
    );
  }
  return formatCentsAsPrice(priceCents);
}

/**
 * Gallery URLs for a custom variant selection.
 * Order: variant images (configured order) → remaining product images (DB order)
 * → shared URLs last. Each URL once.
 */
export function orderGalleryForTextVariant(input: {
  images: string[];
  sharedImageUrls?: string[] | null;
  variantImageUrls?: string[];
}): string[] {
  const images = input.images.filter(Boolean);
  if (images.length === 0) return [];

  const sharedSet = new Set(
    Array.isArray(input.sharedImageUrls) ? input.sharedImageUrls : [],
  );
  const variantConfigured = (input.variantImageUrls ?? []).filter((u) =>
    images.includes(u),
  );

  const used = new Set<string>();
  const out: string[] = [];

  const push = (url: string) => {
    if (!url || used.has(url)) return;
    used.add(url);
    out.push(url);
  };

  if (variantConfigured.length > 0) {
    for (const u of variantConfigured) push(u);
    for (const u of images) {
      if (!sharedSet.has(u)) push(u);
    }
    for (const u of images) {
      if (sharedSet.has(u)) push(u);
    }
  } else {
    for (const u of images) {
      if (!sharedSet.has(u)) push(u);
    }
    for (const u of images) {
      if (sharedSet.has(u)) push(u);
    }
  }

  return out;
}

/** Apply percent product discount to a variant net (euros), round to cents. */
export function applyPercentToVariantNet(
  priceCents: number,
  discountPercent: number,
): number {
  const clamped = Math.min(100, Math.max(0, discountPercent));
  const euros = centsToEuros(priceCents) * (1 - clamped / 100);
  return eurosToCents(euros);
}

/**
 * Absolute sale_price discounts are incompatible with custom multi-price products.
 * Percent-only (sale derived from percent) is OK when sale ≈ computeSalePrice(original, percent).
 */
export function isAbsoluteSaleDiscountConflict(input: {
  originalPrice: string;
  salePrice: string | null | undefined;
  discountPercent: number;
  toleranceCents?: number;
}): boolean {
  const { originalPrice, salePrice, discountPercent } = input;
  // Percent-only rows (no absolute sale) never conflict with custom multi-price.
  if (salePrice == null || !String(salePrice).trim()) return false;
  const tolerance = input.toleranceCents ?? 1;
  const expected = parsePriceToCents(
    formatPrice(
      Math.round(
        parsePrice(originalPrice) * (1 - Math.min(100, Math.max(0, discountPercent)) / 100) * 100,
      ) / 100,
    ),
  );
  // Better: use same rounding as computeSalePrice
  const base = parsePrice(originalPrice);
  const expectedCents = eurosToCents(
    Math.round(base * (1 - Math.min(100, Math.max(0, discountPercent)) / 100) * 100) / 100,
  );
  const actualCents = parsePriceToCents(salePrice);
  // If admin set an absolute sale that doesn't match percent-derived, it's absolute conflict.
  // Also: if original equals product single price and sale differs from percent — conflict when
  // we can't express all variants by one absolute sale.
  // Policy: any active/scheduled discount where sale_price is the authority (not purely percent)
  // — we treat as conflict when |sale - percentDerived| > tolerance OR when discount is stored
  // with explicit sale that won't match every variant.
  // Practical rule for this app: conflict if sale_price is set AND percent is 0 with sale < original
  // OR sale doesn't match percent derivation within tolerance.
  if (!Number.isFinite(base) || base <= 0) return false;
  if (Math.abs(actualCents - expectedCents) > tolerance) return true;
  // Matched percent derivation — allowed (percent path).
  void expected;
  return false;
}

/** Simpler public API: percent-only discounts are those whose sale matches percent math. */
export function discountIsPercentCompatible(input: {
  originalPrice: string;
  salePrice: string | null | undefined;
  discountPercent: number;
}): boolean {
  return !isAbsoluteSaleDiscountConflict(input);
}
