import {
  AdminLoadingShell,
  AdminProductsListSkeleton,
} from "@/components/admin/AdminSkeleton";

export default function AdminProduktyLoading() {
  return (
    <AdminLoadingShell>
      <AdminProductsListSkeleton />
    </AdminLoadingShell>
  );
}
