import { ProductCatalogProvider } from "@/components/ProductCatalogProvider";
import { listTaxonomy } from "@/lib/categories-server";
import { listDiscounts } from "@/lib/discounts-server";
import { listProducts } from "@/lib/products-server";

export default async function AccountLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [products, discounts, taxonomy] = await Promise.all([
    listProducts(),
    listDiscounts(),
    listTaxonomy(),
  ]);

  return (
    <ProductCatalogProvider
      products={products}
      discounts={discounts}
      taxonomy={taxonomy}
    >
      <div className="min-h-dvh bg-[#faf8f5]">{children}</div>
    </ProductCatalogProvider>
  );
}
