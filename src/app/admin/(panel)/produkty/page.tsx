import { AdminProductsManager } from "@/components/admin/AdminProductsManager";
import { listProducts } from "@/lib/products-server";

export default async function AdminProduktyPage() {
  const products = await listProducts();
  return (
    <main className="flex flex-1 flex-col px-4 py-5 sm:px-5 lg:px-6 lg:py-6">
      <AdminProductsManager initialProducts={products} />
    </main>
  );
}
