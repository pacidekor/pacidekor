import {
  AdminHeaderSkeleton,
  AdminLoadingShell,
  AdminSearchFilterSkeleton,
  AdminTableSkeleton,
  Sk,
} from "@/components/admin/AdminSkeleton";

export default function AdminZlavyLoading() {
  return (
    <AdminLoadingShell>
      <AdminHeaderSkeleton
        titleClassName="h-8 w-24 sm:h-9"
        descriptionClassName="mt-3 h-4 w-full max-w-md"
        action
      />
      <div className="mt-5">
        <AdminSearchFilterSkeleton />
        <div className="mb-3 flex gap-2">
          <Sk className="h-9 w-24 rounded-full" />
          <Sk className="h-9 w-28 rounded-full" />
          <Sk className="h-9 w-20 rounded-full" />
        </div>
        <AdminTableSkeleton rows={7} withThumb />
      </div>
    </AdminLoadingShell>
  );
}
