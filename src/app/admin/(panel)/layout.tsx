import { AdminAuthGate } from "@/components/admin/AdminAuthGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProductCatalogProvider } from "@/components/ProductCatalogProvider";
import { listProducts } from "@/lib/products-server";

export default async function AdminPanelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const products = await listProducts();

  return (
    <AdminAuthGate>
      <ProductCatalogProvider products={products}>
        <AdminShell>{children}</AdminShell>
      </ProductCatalogProvider>
    </AdminAuthGate>
  );
}
