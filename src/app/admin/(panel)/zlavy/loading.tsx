import {
  AdminDiscountsListSkeleton,
  AdminLoadingShell,
} from "@/components/admin/AdminSkeleton";

export default function AdminZlavyLoading() {
  return (
    <AdminLoadingShell>
      <AdminDiscountsListSkeleton />
    </AdminLoadingShell>
  );
}
