import {
  AdminCustomersListSkeleton,
  AdminLoadingShell,
} from "@/components/admin/AdminSkeleton";

export default function AdminVelkoobchodneUctyLoading() {
  return (
    <AdminLoadingShell>
      <AdminCustomersListSkeleton
        titleClassName="h-8 w-52 sm:h-9"
        descriptionClassName="mt-3 h-4 w-full max-w-lg"
      />
    </AdminLoadingShell>
  );
}
