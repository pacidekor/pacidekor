import {
  AdminBlogListSkeleton,
  AdminLoadingShell,
} from "@/components/admin/AdminSkeleton";

export default function AdminBlogLoading() {
  return (
    <AdminLoadingShell>
      <AdminBlogListSkeleton />
    </AdminLoadingShell>
  );
}
