import {
  AdminHeaderSkeleton,
  AdminLoadingShell,
  AdminSearchFilterSkeleton,
  AdminTableSkeleton,
} from "@/components/admin/AdminSkeleton";

export default function AdminProduktyLoading() {
  return (
    <AdminLoadingShell>
      <AdminHeaderSkeleton
        titleClassName="h-8 w-36 sm:h-9"
        descriptionClassName="mt-3 h-4 w-full max-w-lg"
        action
      />
      <div className="mt-5">
        <AdminSearchFilterSkeleton />
        <AdminTableSkeleton rows={9} withThumb />
      </div>
    </AdminLoadingShell>
  );
}
