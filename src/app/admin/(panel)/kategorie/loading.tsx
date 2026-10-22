import {
  AdminCategoriesListSkeleton,
  AdminLoadingShell,
} from "@/components/admin/AdminSkeleton";

export default function AdminKategorieLoading() {
  return (
    <AdminLoadingShell>
      <AdminCategoriesListSkeleton />
    </AdminLoadingShell>
  );
}
