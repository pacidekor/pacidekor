import {
  AdminLoadingShell,
  AdminOrdersListSkeleton,
} from "@/components/admin/AdminSkeleton";

export default function AdminObjednavkyLoading() {
  return (
    <AdminLoadingShell>
      <AdminOrdersListSkeleton />
    </AdminLoadingShell>
  );
}
