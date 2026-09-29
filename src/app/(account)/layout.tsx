import { AccountDataSync } from "@/components/AccountDataSync";
import { ProductCatalogProvider } from "@/components/ProductCatalogProvider";
import { listTaxonomy } from "@/lib/categories-server";
import { listDiscounts } from "@/lib/discounts-server";
import { listProducts } from "@/lib/products-server";

export default async function AccountLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let products: Awaited<ReturnType<typeof listProducts>> = [];
  let discounts: Awaited<ReturnType<typeof listDiscounts>> = [];
  let taxonomy: Awaited<ReturnType<typeof listTaxonomy>> | undefined;

  try {
    [products, discounts, taxonomy] = await Promise.all([
      listProducts(),
      listDiscounts(),
      listTaxonomy(),
    ]);
  } catch (error) {
    console.error("AccountLayout catalog:", error);
  }

  return (
    <ProductCatalogProvider
      products={products}
      discounts={discounts}
      taxonomy={taxonomy}
    >
      <AccountDataSync />
      <div className="min-h-dvh bg-[#faf8f5]">{children}</div>
    </ProductCatalogProvider>
  );
}
