import { AdminProductsManager } from "@/components/admin/AdminProductsManager";
import { isValidStockFilter } from "@/lib/admin-product-filters";
import { listProductsForAdmin } from "@/lib/products-server";

export default async function AdminProduktyPage({
  searchParams,
}: {
  searchParams: Promise<{ stock?: string; edit?: string }>;
}) {
  const { stock, edit } = await searchParams;
  const products = await listProductsForAdmin();
  const initialStockFilter = isValidStockFilter(stock) ? stock : "all";
  const initialEditProductId = edit?.trim() || undefined;

  return (
    <main className="flex flex-1 flex-col px-4 py-5 sm:px-5 lg:px-6 lg:py-6">
      <AdminProductsManager
        initialProducts={products}
        initialStockFilter={initialStockFilter}
        initialEditProductId={initialEditProductId}
      />
    </main>
  );
}
