import { AdminAuthGate } from "@/components/admin/AdminAuthGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProductCatalogProvider } from "@/components/ProductCatalogProvider";
import { listTaxonomy } from "@/lib/categories-server";
import { listDiscounts } from "@/lib/discounts-server";
import { listProducts } from "@/lib/products-server";

export default async function AdminPanelLayout({
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
    <AdminAuthGate>
      <ProductCatalogProvider
        products={products}
        discounts={discounts}
        taxonomy={taxonomy}
      >
        <AdminShell>{children}</AdminShell>
      </ProductCatalogProvider>
    </AdminAuthGate>
  );
}
