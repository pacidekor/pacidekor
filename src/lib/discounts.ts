import { formatPrice, parsePrice } from "@/lib/cart";
import {
  getDiscountsSnapshot,
  setDiscountsSnapshot,
  DISCOUNTS_EVENT,
} from "@/lib/discount-store";
import {
  findCatalogProductById,
} from "@/lib/product-catalog";
import type { Product } from "@/lib/products";

export { DISCOUNTS_EVENT };

export type DiscountStatus = "active" | "inactive" | "scheduled" | "expired";

export type ProductDiscount = {
  id: string;
  productId: string;
  originalPrice: string;
  salePrice: string;
  discountPercent: number;
  showOnAkciaPage: boolean;
  active: boolean;
  startsAt?: string;
  endsAt?: string;
  createdAt: string;
  updatedAt: string;
};

export const DISCOUNT_STATUS_META: Record<
  DiscountStatus,
  { label: string; className: string }
> = {
  active: {
    label: "Aktívna",
    className: "bg-[#e8ebe2] text-[#5a6648]",
  },
  inactive: {
    label: "Neaktívna",
    className: "bg-[#2f2924]/08 text-[#2f2924]/55",
  },
  scheduled: {
    label: "Naplánovaná",
    className: "bg-[#e8eef5] text-[#3d5a80]",
  },
  expired: {
    label: "Vypršaná",
    className: "bg-[#f3e8e6] text-[#9a4d3f]",
  },
};

export function seedDiscounts(): ProductDiscount[] {
  return [];
}

/** Current discounts from the in-memory store (hydrated from Supabase). */
export function readDiscounts(): ProductDiscount[] {
  return getDiscountsSnapshot();
}

/** Update client snapshot after a successful server write. */
export function writeDiscounts(list: ProductDiscount[]) {
  setDiscountsSnapshot(list);
}

export function startOfDay(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`);
}

export function endOfDay(isoDate: string) {
  return new Date(`${isoDate}T23:59:59.999`);
}

export function getDiscountStatus(
  discount: ProductDiscount,
  now = new Date(),
): DiscountStatus {
  if (!discount.active) return "inactive";

  if (discount.startsAt) {
    const start = startOfDay(discount.startsAt);
    if (now < start) return "scheduled";
  }

  if (discount.endsAt) {
    const end = endOfDay(discount.endsAt);
    if (now > end) return "expired";
  }

  return "active";
}

export function isDiscountEffectivelyActive(
  discount: ProductDiscount,
  now = new Date(),
) {
  return getDiscountStatus(discount, now) === "active";
}

export function computeSalePrice(originalPrice: string, percent: number) {
  const base = parsePrice(originalPrice);
  if (!Number.isFinite(base) || base <= 0) return formatPrice(0);
  const clamped = Math.min(100, Math.max(0, percent));
  const sale = Math.round(base * (1 - clamped / 100) * 100) / 100;
  return formatPrice(sale);
}

export function computePercent(originalPrice: string, salePrice: string) {
  const base = parsePrice(originalPrice);
  const sale = parsePrice(salePrice);
  if (!Number.isFinite(base) || base <= 0 || !Number.isFinite(sale)) return 0;
  const percent = Math.round((1 - sale / base) * 100);
  return Math.min(100, Math.max(0, percent));
}

export function formatDiscountValidity(discount: ProductDiscount) {
  if (!discount.startsAt && !discount.endsAt) return "Bez obmedzenia";

  const format = (iso: string) => {
    const [year, month, day] = iso.split("-");
    if (!year || !month || !day) return iso;
    return `${day}.${month}.${year}`;
  };

  if (discount.startsAt && discount.endsAt) {
    return `${format(discount.startsAt)} – ${format(discount.endsAt)}`;
  }
  if (discount.startsAt) return `Od ${format(discount.startsAt)}`;
  return `Do ${format(discount.endsAt!)}`;
}

export function getProductForDiscount(productId: string) {
  return findCatalogProductById(productId);
}

/** Base catalog price before any managed discount is applied. */
export function getProductBasePrice(product: Product): string {
  return product.originalPrice ?? product.price;
}

export function applyDiscountToProduct(
  product: Product,
  discounts: ProductDiscount[],
  now = new Date(),
): Product {
  const discount = discounts.find((item) => item.productId === product.id);
  if (!discount) return product;

  if (isDiscountEffectivelyActive(discount, now)) {
    return {
      ...product,
      price: discount.salePrice,
      originalPrice: discount.originalPrice,
      discount: discount.discountPercent,
    };
  }

  return {
    ...product,
    price: discount.originalPrice,
    originalPrice: undefined,
    discount: undefined,
  };
}

export function applyDiscountsToProducts(
  list: Product[],
  discounts: ProductDiscount[],
  now = new Date(),
) {
  return list.map((product) =>
    applyDiscountToProduct(product, discounts, now),
  );
}

export function getAkciaProductIds(
  discounts: ProductDiscount[] = seedDiscounts(),
  now = new Date(),
) {
  return discounts
    .filter(
      (discount) =>
        discount.showOnAkciaPage && isDiscountEffectivelyActive(discount, now),
    )
    .map((discount) => discount.productId);
}

export function getAkciaProducts(
  discounts: ProductDiscount[] = seedDiscounts(),
  now = new Date(),
): Product[] {
  const ids = getAkciaProductIds(discounts, now);
  return ids
    .map((id) => {
      const product = getProductForDiscount(id);
      if (!product) return null;
      return applyDiscountToProduct(product, discounts, now);
    })
    .filter((product): product is Product => Boolean(product));
}

export function createDiscountId() {
  return `discount-${Date.now()}`;
}
