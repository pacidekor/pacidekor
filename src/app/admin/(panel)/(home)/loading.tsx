import {
  AdminLoadingShell,
  AdminOverviewSkeleton,
} from "@/components/admin/AdminSkeleton";

export default function AdminOverviewLoading() {
  return (
    <AdminLoadingShell>
      <AdminOverviewSkeleton />
    </AdminLoadingShell>
  );
}
