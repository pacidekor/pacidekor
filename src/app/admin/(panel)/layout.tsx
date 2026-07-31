import { AdminAuthGate } from "@/components/admin/AdminAuthGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProductCatalogProvider } from "@/components/ProductCatalogProvider";
import { listDiscounts } from "@/lib/discounts-server";
import { listProducts } from "@/lib/products-server";

export default async function AdminPanelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [products, discounts] = await Promise.all([
    listProducts(),
    listDiscounts(),
  ]);

  return (
    <AdminAuthGate>
      <ProductCatalogProvider products={products} discounts={discounts}>
        <AdminShell>{children}</AdminShell>
      </ProductCatalogProvider>
    </AdminAuthGate>
  );
}
