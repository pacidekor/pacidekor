import {
  AdminHeaderSkeleton,
  AdminLoadingShell,
} from "@/components/admin/AdminSkeleton";

export default function AdminSkladLoading() {
  return (
    <AdminLoadingShell>
      <AdminHeaderSkeleton titleClassName="h-8 w-24 sm:h-9" />
    </AdminLoadingShell>
  );
}
