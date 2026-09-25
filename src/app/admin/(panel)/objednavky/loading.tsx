import {
  AdminHeaderSkeleton,
  AdminLoadingShell,
  AdminSearchFilterSkeleton,
  AdminTableSkeleton,
} from "@/components/admin/AdminSkeleton";

export default function AdminObjednavkyLoading() {
  return (
    <AdminLoadingShell>
      <AdminHeaderSkeleton
        titleClassName="h-8 w-40 sm:h-9"
        descriptionClassName="mt-3 h-4 w-full max-w-md"
      />
      <div className="mt-5">
        <AdminSearchFilterSkeleton />
        <AdminTableSkeleton rows={10} />
      </div>
    </AdminLoadingShell>
  );
}
