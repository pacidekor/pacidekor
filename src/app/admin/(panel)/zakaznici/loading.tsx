import {
  AdminCustomersListSkeleton,
  AdminLoadingShell,
} from "@/components/admin/AdminSkeleton";

export default function AdminZakazniciLoading() {
  return (
    <AdminLoadingShell>
      <AdminCustomersListSkeleton />
    </AdminLoadingShell>
  );
}
