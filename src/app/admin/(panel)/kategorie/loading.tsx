import {
  AdminHeaderSkeleton,
  AdminLoadingShell,
  AdminTableSkeleton,
  Sk,
} from "@/components/admin/AdminSkeleton";

export default function AdminKategorieLoading() {
  return (
    <AdminLoadingShell>
      <AdminHeaderSkeleton
        titleClassName="h-8 w-36 sm:h-9"
        descriptionClassName="mt-3 h-4 w-full max-w-md"
        action
      />
      <div className="mt-5 space-y-4">
        <Sk className="h-11 w-full max-w-md" />
        <AdminTableSkeleton rows={8} withThumb />
      </div>
    </AdminLoadingShell>
  );
}
