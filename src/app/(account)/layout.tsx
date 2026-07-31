import { ProductCatalogProvider } from "@/components/ProductCatalogProvider";
import { listDiscounts } from "@/lib/discounts-server";
import { listProducts } from "@/lib/products-server";

export default async function AccountLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [products, discounts] = await Promise.all([
    listProducts(),
    listDiscounts(),
  ]);

  return (
    <ProductCatalogProvider products={products} discounts={discounts}>
      <div className="min-h-dvh bg-[#faf8f5]">{children}</div>
    </ProductCatalogProvider>
  );
}
