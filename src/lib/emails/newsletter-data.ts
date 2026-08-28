import "server-only";

import { formatPriceIncVat } from "@/lib/price";
import { getAkciaProductIds } from "@/lib/discounts";
import { listDiscounts } from "@/lib/discounts-server";
import type { NewsletterProductCard } from "@/lib/emails/types";
import { absolutize } from "@/lib/emails/utils";
import { getNewestProducts, productHref, type Product } from "@/lib/products";
import { listPricedProducts } from "@/lib/products-server";

const MAX_NEW = 3;
const MAX_SALE = 3;

export function productToNewsletterCard(
  product: Product,
  siteUrl: string,
): NewsletterProductCard {
  const image = product.image.trim();
  return {
    name: product.name,
    price: formatPriceIncVat(product.price),
    originalPrice: product.originalPrice
      ? formatPriceIncVat(product.originalPrice)
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
 * Reálne novinky + akcie z katalógu pre newsletter preview / odoslanie.
 */
export async function getNewsletterCatalogProducts(siteUrl: string): Promise<{
  newProducts: NewsletterProductCard[];
  saleProducts: NewsletterProductCard[];
}> {
  const [products, discounts] = await Promise.all([
    listPricedProducts(),
    listDiscounts(),
  ]);

  const akciaIds = new Set(getAkciaProductIds(discounts));
  const news = getNewestProducts(products, 12)
    .filter(withImage)
    .slice(0, MAX_NEW);
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
  };
}
