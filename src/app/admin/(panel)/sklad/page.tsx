import { AdminInventoryManager } from "@/components/admin/AdminInventoryManager";
import { listProductsForAdmin } from "@/lib/products-server";

export default async function AdminSkladPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const { product } = await searchParams;
  const products = await listProductsForAdmin();
  const initialOpenProductId = product?.trim() || undefined;

  return (
    <main className="flex flex-1 flex-col px-4 py-5 sm:px-5 lg:px-6 lg:py-6">
      <AdminInventoryManager
        initialProducts={products}
        initialOpenProductId={initialOpenProductId}
      />
    </main>
  );
}
