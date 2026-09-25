import { AdminAuthGate } from "@/components/admin/AdminAuthGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProductCatalogProvider } from "@/components/ProductCatalogProvider";
import { listTaxonomy } from "@/lib/categories-server";
import { listDiscounts } from "@/lib/discounts-server";

/**
 * Shell only — no full product catalog on every admin navigation.
 * Pages that need products fetch their own (light) lists.
 */
export default async function AdminPanelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [discounts, taxonomy] = await Promise.all([
    listDiscounts(),
    listTaxonomy(),
  ]);

  return (
    <AdminAuthGate>
      <ProductCatalogProvider
        products={[]}
        discounts={discounts}
        taxonomy={taxonomy}
      >
        <AdminShell>{children}</AdminShell>
      </ProductCatalogProvider>
    </AdminAuthGate>
  );
}
