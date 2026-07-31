import { ProductCatalogProvider } from "@/components/ProductCatalogProvider";
import { listProducts } from "@/lib/products-server";

export default async function AccountLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const products = await listProducts();

  return (
    <ProductCatalogProvider products={products}>
      <div className="min-h-dvh bg-[#faf8f5]">{children}</div>
    </ProductCatalogProvider>
  );
}
