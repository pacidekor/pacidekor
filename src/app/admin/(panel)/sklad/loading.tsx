import {
  AdminLoadingShell,
  AdminSkladListSkeleton,
} from "@/components/admin/AdminSkeleton";

export default function AdminSkladLoading() {
  return (
    <AdminLoadingShell>
      <AdminSkladListSkeleton />
    </AdminLoadingShell>
  );
}
