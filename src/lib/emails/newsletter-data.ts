import "server-only";

import { formatAudiencePriceIncVat } from "@/lib/price";
import { getAkciaProductIds } from "@/lib/discounts";
import { listDiscounts } from "@/lib/discounts-server";
import type { NewsletterProductCard } from "@/lib/emails/types";
import { absolutize } from "@/lib/emails/utils";
import {
  getNewestProducts,
  isActiveNewProduct,
  NEW_PRODUCT_DAYS,
  productHref,
  type Product,
} from "@/lib/products";
import { listPricedProducts } from "@/lib/products-server";

const MAX_NEW = 3;
const MAX_SALE = 3;

/** Novinka musí byť „čerstvá“ (vytvorená / označená) v tomto okne. */
export const NEWSLETTER_FRESH_NEW_DAYS = 7;

/** Minimálny počet čerstvých noviniek, aby sa newsletter odoslal. */
export const NEWSLETTER_MIN_FRESH_NEW = 2;

export function productToNewsletterCard(
  product: Product,
  siteUrl: string,
): NewsletterProductCard {
  const image = product.image.trim();
  // Newsletter = verejnosť → maloobchodná cena (+50 %) s DPH
  return {
    name: product.name,
    price: formatAudiencePriceIncVat(product.price, false),
    originalPrice: product.originalPrice
      ? formatAudiencePriceIncVat(product.originalPrice, false)
      : undefined,
    discountPercent: product.discount,
    url: absolutize(siteUrl, productHref(product.slug)),
    imageUrl: image ? absolutize(siteUrl, image) : undefined,
  };
}

function withImage(product: Product) {
  return Boolean(product.image?.trim());
}

/**
 * Odhad, kedy produkt začal byť novinkou:
 * max(createdAt, newUntil − NEW_PRODUCT_DAYS).
 */
export function newProductMarkedAtMs(product: Product): number {
  const created = product.createdAt
    ? new Date(product.createdAt).getTime()
    : 0;
  const until = product.newUntil ? new Date(product.newUntil).getTime() : 0;
  const markedFromUntil = Number.isFinite(until)
    ? until - NEW_PRODUCT_DAYS * 86_400_000
    : 0;
  return Math.max(
    Number.isFinite(created) ? created : 0,
    Number.isFinite(markedFromUntil) ? markedFromUntil : 0,
  );
}

export function isFreshNewProduct(
  product: Product,
  now: number = Date.now(),
  freshDays: number = NEWSLETTER_FRESH_NEW_DAYS,
) {
  if (!isActiveNewProduct(product, now) || !withImage(product)) return false;
  const markedAt = newProductMarkedAtMs(product);
  if (!markedAt) return false;
  return now - markedAt <= freshDays * 86_400_000;
}

export function getFreshNewProducts(
  products: Product[],
  options?: { limit?: number; freshDays?: number; now?: number },
) {
  const now = options?.now ?? Date.now();
  const freshDays = options?.freshDays ?? NEWSLETTER_FRESH_NEW_DAYS;
  const list = products
    .filter((product) => isFreshNewProduct(product, now, freshDays))
    .sort((a, b) => newProductMarkedAtMs(b) - newProductMarkedAtMs(a));
  return options?.limit != null ? list.slice(0, options.limit) : list;
}

/**
 * Reálne čerstvé novinky + akcie z katalógu pre newsletter preview / odoslanie.
 */
export async function getNewsletterCatalogProducts(siteUrl: string): Promise<{
  newProducts: NewsletterProductCard[];
  saleProducts: NewsletterProductCard[];
  freshNewCount: number;
}> {
  const [products, discounts] = await Promise.all([
    listPricedProducts(),
    listDiscounts(),
  ]);

  const akciaIds = new Set(getAkciaProductIds(discounts));
  const allFresh = getFreshNewProducts(products);
  const freshNews = allFresh.slice(0, MAX_NEW);
  // Fallback pre preview: ak nie sú čerstvé, ukáž aktívne novinky (odoslanie aj tak skipne).
  const news =
    freshNews.length > 0
      ? freshNews
      : getNewestProducts(products, 12).filter(withImage).slice(0, MAX_NEW);

  const sales = products
    .filter((product) => akciaIds.has(product.id) && withImage(product))
    .slice(0, MAX_SALE);

  return {
    newProducts: news.map((product) =>
      productToNewsletterCard(product, siteUrl),
    ),
    saleProducts: sales.map((product) =>
      productToNewsletterCard(product, siteUrl),
    ),
    freshNewCount: allFresh.length,
  };
}
