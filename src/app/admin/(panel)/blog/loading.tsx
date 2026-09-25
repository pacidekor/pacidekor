import {
  AdminHeaderSkeleton,
  AdminLoadingShell,
  AdminSearchFilterSkeleton,
  AdminTableSkeleton,
} from "@/components/admin/AdminSkeleton";

export default function AdminBlogLoading() {
  return (
    <AdminLoadingShell>
      <AdminHeaderSkeleton
        titleClassName="h-8 w-20 sm:h-9"
        descriptionClassName="mt-3 h-4 w-full max-w-sm"
        action
      />
      <div className="mt-5">
        <AdminSearchFilterSkeleton />
        <AdminTableSkeleton rows={7} withThumb />
      </div>
    </AdminLoadingShell>
  );
}
