import { AdminAnalyticsManager } from "@/components/admin/AdminAnalyticsManager";
import { listDiscountsAction } from "@/lib/actions/discounts";
import { parseAnalyticsPeriod } from "@/lib/analytics";
import {
  formatDiscountValidity,
  getDiscountStatus,
  getProductForDiscount,
} from "@/lib/discounts";
import { listProducts } from "@/lib/products-server";
import { setProductCatalog } from "@/lib/product-catalog";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ range?: string }>;

export default async function AdminAnalytikaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const catalog = await listProducts();
  setProductCatalog(catalog);

  const discountResult = await listDiscountsAction();
  const discounts = discountResult.ok ? discountResult.data : [];

  const discountRows = discounts
    .map((discount) => {
      const status = getDiscountStatus(discount);
      return {
        id: discount.id,
        productName:
          getProductForDiscount(discount.productId)?.name ?? discount.productId,
        discountPercent: discount.discountPercent,
        validityLabel: formatDiscountValidity(discount),
        status,
      };
    })
    .filter((row) => row.status === "active" || row.status === "scheduled")
    .slice(0, 8);

  return (
    <main className="flex flex-1 flex-col px-4 py-5 sm:px-5 lg:px-6 lg:py-6">
      <AdminAnalyticsManager
        catalog={catalog.map((product) => ({
          id: product.id,
          slug: product.slug,
          name: product.name,
          image: product.image,
        }))}
        discountRows={discountRows}
        initialPeriod={parseAnalyticsPeriod(params.range)}
      />
    </main>
  );
}
